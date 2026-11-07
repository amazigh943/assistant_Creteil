import type { Agent, Id, ScheduleKind } from "../domain/types";
import { formatSlot, formatTime } from "../planning/format";
import { findNextFreeSlot, WORKDAY } from "../planning/slots";
import { FOLLOW_UP_MODE_LABEL } from "../tickets/labels";
import { openTicketCountByAgent, ticketContext } from "../tickets/queries";
import type { AutomationRule, AutomationStep, RuleContext } from "./types";

/** Au-delà de ce nombre de tentatives, on propose la clôture plutôt qu'un nouveau rappel. */
export const MAX_CALL_ATTEMPTS = 3;

const HOUR = 3_600_000;

function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

function pendingRemindersFor(ctx: RuleContext) {
  return ctx.data.reminders.filter((r) => r.ticketId === ctx.ticket.id && !r.done);
}

function futureSlotsFor(ctx: RuleContext) {
  return ctx.data.schedule.filter(
    (s) => s.ticketId === ctx.ticket.id && new Date(s.end) > ctx.now,
  );
}

/* ------------------------------------------------------------------ */
/* Règles transverses : nettoyage des rappels et du planning           */
/* ------------------------------------------------------------------ */

const closePendingReminders: AutomationRule = {
  id: "reminders.close-pending",
  description: "Clôture les rappels en cours du ticket : l'intervention vient d'avoir lieu.",
  appliesTo: ["resolved", "no_answer", "follow_up", "transfer"],
  plan(ctx) {
    const pending = pendingRemindersFor(ctx);
    if (pending.length === 0) return [];
    return [
      {
        ruleId: this.id,
        kind: "reminder",
        title:
          pending.length === 1
            ? "Rappel en cours clôturé"
            : `${pending.length} rappels en cours clôturés`,
        detail: pending.map((r) => r.title).join(" · "),
        effects: [{ type: "reminder.complete", reminderIds: pending.map((r) => r.id) }],
      },
    ];
  },
};

const releaseFutureSlots: AutomationRule = {
  id: "planning.release-slots",
  description: "Libère les créneaux à venir liés au ticket lorsqu'ils ne sont plus nécessaires.",
  appliesTo: ["resolved", "follow_up", "transfer", "no_answer"],
  plan(ctx) {
    const slots = futureSlotsFor(ctx);
    if (slots.length === 0) return [];
    const now = ctx.now;
    return [
      {
        ruleId: this.id,
        kind: "planning",
        title:
          slots.length === 1
            ? `Créneau ${formatSlot(new Date(slots[0].start), now)} libéré`
            : `${slots.length} créneaux libérés dans le planning`,
        detail: "Le planning est mis à jour automatiquement.",
        effects: [{ type: "schedule.remove", itemIds: slots.map((s) => s.id) }],
      },
    ];
  },
};

/* ------------------------------------------------------------------ */
/* Résolution                                                          */
/* ------------------------------------------------------------------ */

const resolveTicket: AutomationRule = {
  id: "ticket.resolve",
  description: "Passe le ticket en « Résolu » et prépare l'e-mail de clôture.",
  appliesTo: ["resolved"],
  plan(ctx) {
    const { requester } = ticketContext(ctx.data, ctx.ticket);
    const steps: AutomationStep[] = [
      {
        ruleId: this.id,
        kind: "status",
        title: "Ticket marqué comme résolu",
        detail: "Le SLA est arrêté et le ticket sort de votre file.",
        effects: [
          {
            type: "ticket.update",
            ticketId: ctx.ticket.id,
            patch: { status: "resolved", resolvedAt: ctx.now.toISOString(), callAttempts: 0 },
          },
        ],
      },
    ];
    if (requester) {
      steps.push({
        ruleId: "notification.resolution",
        kind: "notification",
        title: `E-mail de clôture préparé pour ${fullName(requester)}`,
        detail: "Envoi désactivé dans le prototype : le message est seulement préparé.",
        effects: [
          {
            type: "notification.prepare",
            ticketId: ctx.ticket.id,
            channel: "email",
            to: requester.email,
            subject: `[${ctx.ticket.reference}] Votre demande est résolue`,
            body: `Bonjour ${requester.firstName},\n\nVotre demande « ${ctx.ticket.title} » a été résolue. Si le problème réapparaît, répondez simplement à ce message : le ticket sera rouvert.\n\nL'équipe support`,
          },
        ],
      });
    }
    return steps;
  },
};

/* ------------------------------------------------------------------ */
/* Aucune réponse                                                      */
/* ------------------------------------------------------------------ */

const noAnswerFollowUp: AutomationRule = {
  id: "no-answer.retry",
  description:
    "Met le ticket en attente, programme un rappel au prochain créneau libre et prévient l'utilisateur. " +
    `Après ${MAX_CALL_ATTEMPTS} tentatives, propose la clôture.`,
  appliesTo: ["no_answer"],
  plan(ctx) {
    const { requester } = ticketContext(ctx.data, ctx.ticket);
    const attempts = ctx.ticket.callAttempts + 1;
    const agentId = ctx.input.agentId;
    const steps: AutomationStep[] = [
      {
        ruleId: this.id,
        kind: "status",
        title: `Ticket en attente · tentative ${attempts} sur ${MAX_CALL_ATTEMPTS}`,
        effects: [
          {
            type: "ticket.update",
            ticketId: ctx.ticket.id,
            patch: { status: "waiting", callAttempts: attempts },
          },
        ],
      },
    ];

    // Les créneaux existants du ticket sont libérés par une autre règle :
    // on les ignore pour chercher le prochain créneau libre.
    const otherItems = ctx.data.schedule.filter((s) => s.ticketId !== ctx.ticket.id);

    if (attempts >= MAX_CALL_ATTEMPTS) {
      const tomorrow = new Date(ctx.now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(WORKDAY.startHour, WORKDAY.startMinute, 0, 0);
      steps.push({
        ruleId: this.id,
        kind: "reminder",
        title: `Clôture sans réponse proposée ${formatSlot(tomorrow, ctx.now)}`,
        detail: `${MAX_CALL_ATTEMPTS} tentatives sans réponse : un rappel vous demandera de clôturer le ticket si l'utilisateur ne revient pas.`,
        effects: [
          {
            type: "reminder.create",
            reminder: {
              id: ctx.newId("rem"),
              organizationId: ctx.ticket.organizationId,
              ticketId: ctx.ticket.id,
              agentId,
              dueAt: tomorrow.toISOString(),
              title: `Clôturer ${ctx.ticket.reference} sans réponse`,
              done: false,
              createdBy: "automation",
            },
          },
        ],
      });
    } else {
      // 1re tentative : rappel dans 2 h ; 2e : le lendemain matin.
      const earliest =
        attempts === 1
          ? new Date(ctx.now.getTime() + 2 * HOUR)
          : (() => {
              const d = new Date(ctx.now);
              d.setDate(d.getDate() + 1);
              d.setHours(WORKDAY.startHour, WORKDAY.startMinute, 0, 0);
              return d;
            })();
      const slot = findNextFreeSlot(otherItems, agentId, earliest, 15);
      steps.push(
        {
          ruleId: this.id,
          kind: "reminder",
          title: `Rappel programmé ${formatSlot(slot.start, ctx.now)}`,
          detail:
            attempts === 1
              ? "Premier créneau libre à partir de 2 h après cet appel."
              : "Deuxième tentative : rappel en début de journée suivante.",
          effects: [
            {
              type: "reminder.create",
              reminder: {
                id: ctx.newId("rem"),
                organizationId: ctx.ticket.organizationId,
                ticketId: ctx.ticket.id,
                agentId,
                dueAt: slot.start.toISOString(),
                title: requester
                  ? `Rappeler ${fullName(requester)} — ${ctx.ticket.reference}`
                  : `Rappeler — ${ctx.ticket.reference}`,
                done: false,
                createdBy: "automation",
              },
            },
          ],
        },
        {
          ruleId: "planning.callback-slot",
          kind: "planning",
          title: `Créneau de rappel ajouté au planning (${formatTime(slot.start)}–${formatTime(slot.end)})`,
          effects: [
            {
              type: "schedule.add",
              item: {
                id: ctx.newId("slot"),
                organizationId: ctx.ticket.organizationId,
                agentId,
                ticketId: ctx.ticket.id,
                kind: "callback",
                title: `Rappel ${ctx.ticket.reference}`,
                start: slot.start.toISOString(),
                end: slot.end.toISOString(),
                createdBy: "automation",
              },
            },
          ],
        },
      );
    }

    if (requester) {
      const last = attempts >= MAX_CALL_ATTEMPTS;
      steps.push({
        ruleId: "notification.no-answer",
        kind: "notification",
        title: last
          ? `Dernière relance préparée pour ${fullName(requester)}`
          : `E-mail « Nous avons tenté de vous joindre » préparé`,
        detail: "Envoi désactivé dans le prototype : le message est seulement préparé.",
        effects: [
          {
            type: "notification.prepare",
            ticketId: ctx.ticket.id,
            channel: "email",
            to: requester.email,
            subject: `[${ctx.ticket.reference}] Nous avons tenté de vous joindre`,
            body: last
              ? `Bonjour ${requester.firstName},\n\nMalgré ${attempts} tentatives, nous n'avons pas réussi à vous joindre au sujet de « ${ctx.ticket.title} ». Sans retour de votre part sous 24 h, la demande sera clôturée.\n\nL'équipe support`
              : `Bonjour ${requester.firstName},\n\nNous avons tenté de vous joindre au ${requester.phone} au sujet de « ${ctx.ticket.title} ». Nous vous rappellerons prochainement. Vous pouvez aussi répondre à ce message pour proposer un horaire.\n\nL'équipe support`,
          },
        ],
      });
    }
    return steps;
  },
};

/* ------------------------------------------------------------------ */
/* Intervention à poursuivre                                           */
/* ------------------------------------------------------------------ */

const KIND_FOR_MODE: Record<"callback" | "remote" | "onsite", ScheduleKind> = {
  callback: "callback",
  remote: "remote",
  onsite: "onsite",
};

const scheduleFollowUp: AutomationRule = {
  id: "follow-up.schedule",
  description: "Planifie la suite de l'intervention et confirme le rendez-vous à l'utilisateur.",
  appliesTo: ["follow_up"],
  plan(ctx) {
    const followUp = ctx.input.followUp;
    if (!followUp) return [];
    const { requester, site } = ticketContext(ctx.data, ctx.ticket);
    const start = new Date(followUp.start);
    const end = new Date(start.getTime() + followUp.durationMin * 60_000);
    const modeLabel = FOLLOW_UP_MODE_LABEL[followUp.mode];

    const steps: AutomationStep[] = [
      {
        ruleId: this.id,
        kind: "status",
        title: "Ticket passé en « Planifié »",
        effects: [
          {
            type: "ticket.update",
            ticketId: ctx.ticket.id,
            patch: { status: "scheduled", callAttempts: 0 },
          },
        ],
      },
      {
        ruleId: "planning.follow-up-slot",
        kind: "planning",
        title: `${modeLabel} planifiée ${formatSlot(start, ctx.now)}`,
        detail: `${formatTime(start)}–${formatTime(end)}${followUp.mode === "onsite" && site ? ` · ${site.name}, ${site.city}` : ""}`,
        effects: [
          {
            type: "schedule.add",
            item: {
              id: ctx.newId("slot"),
              organizationId: ctx.ticket.organizationId,
              agentId: ctx.input.agentId,
              ticketId: ctx.ticket.id,
              kind: KIND_FOR_MODE[followUp.mode],
              title: `${modeLabel} — ${ctx.ticket.reference}`,
              start: start.toISOString(),
              end: end.toISOString(),
              location: followUp.mode === "onsite" && site ? `${site.address}, ${site.city}` : undefined,
              createdBy: "automation",
            },
          },
        ],
      },
    ];

    if (requester) {
      steps.push({
        ruleId: "notification.follow-up",
        kind: "notification",
        title: `Confirmation de rendez-vous préparée pour ${fullName(requester)}`,
        detail: "Envoi désactivé dans le prototype : le message est seulement préparé.",
        effects: [
          {
            type: "notification.prepare",
            ticketId: ctx.ticket.id,
            channel: "email",
            to: requester.email,
            subject: `[${ctx.ticket.reference}] Rendez-vous confirmé`,
            body: `Bonjour ${requester.firstName},\n\nNous poursuivrons l'intervention « ${ctx.ticket.title} » ${formatSlot(start, ctx.now)} (${modeLabel.toLowerCase()}).\n\nL'équipe support`,
          },
        ],
      });
    }
    return steps;
  },
};

/* ------------------------------------------------------------------ */
/* Transfert                                                           */
/* ------------------------------------------------------------------ */

/**
 * Choisit l'agent de l'équipe cible le moins chargé (tickets ouverts),
 * en excluant les agents hors ligne. Départage par ordre alphabétique.
 */
export function pickAssignee(ctx: Pick<RuleContext, "data">, teamId: Id): Agent | undefined {
  const counts = openTicketCountByAgent(ctx.data);
  return ctx.data.agents
    .filter((a) => a.teamId === teamId && a.presence !== "offline")
    .sort(
      (a, b) =>
        (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) ||
        a.lastName.localeCompare(b.lastName, "fr"),
    )[0];
}

const transferTicket: AutomationRule = {
  id: "transfer.route",
  description: "Transfère le ticket à l'équipe cible et l'attribue à l'agent le moins chargé.",
  appliesTo: ["transfer"],
  plan(ctx) {
    const transfer = ctx.input.transfer;
    if (!transfer) return [];
    const team = ctx.data.teams.find((t) => t.id === transfer.teamId);
    if (!team) return [];
    const assignee = pickAssignee(ctx, team.id);
    const load = assignee ? (openTicketCountByAgent(ctx.data).get(assignee.id) ?? 0) : 0;

    const steps: AutomationStep[] = [
      {
        ruleId: this.id,
        kind: "assignment",
        title: assignee
          ? `Transféré à ${team.name} · attribué à ${fullName(assignee)}`
          : `Transféré à ${team.name} · en attente d'attribution`,
        detail: assignee
          ? `Agent le moins chargé de l'équipe (${load} ticket${load > 1 ? "s" : ""} ouvert${load > 1 ? "s" : ""}).`
          : "Aucun agent disponible : le ticket rejoint la file de l'équipe.",
        effects: [
          {
            type: "ticket.update",
            ticketId: ctx.ticket.id,
            patch: { teamId: team.id, assigneeId: assignee?.id ?? null, status: "open" },
          },
        ],
      },
    ];
    if (assignee) {
      steps.push({
        ruleId: "notification.transfer",
        kind: "notification",
        title: `${assignee.firstName} ${assignee.lastName} notifié·e dans FlowPilot`,
        detail: "Le compte rendu de votre intervention est joint au ticket.",
        effects: [
          {
            type: "notification.prepare",
            ticketId: ctx.ticket.id,
            channel: "in_app",
            to: assignee.email,
            subject: `${ctx.ticket.reference} vous a été attribué`,
            body: `Transfert depuis ${ctx.data.teams.find((t) => t.id === ctx.ticket.teamId)?.name ?? "une autre équipe"}.`,
          },
        ],
      });
    }
    return steps;
  },
};

/** Règles actives, dans l'ordre d'évaluation. */
export const DEFAULT_RULES: AutomationRule[] = [
  resolveTicket,
  noAnswerFollowUp,
  scheduleFollowUp,
  transferTicket,
  closePendingReminders,
  releaseFutureSlots,
];
