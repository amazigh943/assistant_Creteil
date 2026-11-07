import type {
  EngineContext,
  InterventionInput,
  TicketEvent,
  TicketEventKind,
  WorkspaceData,
} from "../domain/types";
import { DEFAULT_RULES } from "./rules";
import type { AutomationEffect, AutomationPlan, AutomationRule, AutomationStepKind } from "./types";

export class AutomationError extends Error {}

/**
 * Étape 1 — planifier : évalue les règles applicables et retourne un plan
 * lisible, sans rien modifier. Le plan peut être affiché à l'agent avant validation.
 */
export function planAutomations(
  data: WorkspaceData,
  input: InterventionInput,
  ctx: EngineContext,
  rules: AutomationRule[] = DEFAULT_RULES,
): AutomationPlan {
  const ticket = data.tickets.find((t) => t.id === input.ticketId);
  if (!ticket) throw new AutomationError(`Ticket introuvable : ${input.ticketId}`);
  if (ticket.organizationId !== data.organization.id) {
    throw new AutomationError("Le ticket n'appartient pas à l'organisation courante.");
  }
  const ruleCtx = { ...ctx, data, input, ticket };
  const steps = rules
    .filter((r) => r.appliesTo.includes(input.outcome))
    .flatMap((r) => r.plan(ruleCtx));
  return { ticketId: ticket.id, outcome: input.outcome, steps };
}

const EVENT_KIND: Record<AutomationStepKind, TicketEventKind> = {
  status: "status_changed",
  assignment: "assigned",
  reminder: "reminder",
  planning: "planning",
  notification: "notification",
};

function applyEffect(data: WorkspaceData, effect: AutomationEffect, nowIso: string): WorkspaceData {
  switch (effect.type) {
    case "ticket.update":
      return {
        ...data,
        tickets: data.tickets.map((t) =>
          t.id === effect.ticketId ? { ...t, ...effect.patch, updatedAt: nowIso } : t,
        ),
      };
    case "reminder.create":
      return { ...data, reminders: [...data.reminders, effect.reminder] };
    case "reminder.complete":
      return {
        ...data,
        reminders: data.reminders.map((r) =>
          effect.reminderIds.includes(r.id) ? { ...r, done: true } : r,
        ),
      };
    case "schedule.add":
      return { ...data, schedule: [...data.schedule, effect.item] };
    case "schedule.remove":
      return { ...data, schedule: data.schedule.filter((s) => !effect.itemIds.includes(s.id)) };
    case "notification.prepare":
      // Aucune notification n'est réellement envoyée dans le prototype :
      // le message est conservé dans l'historique du ticket.
      return data;
  }
}

/**
 * Étape 2 — appliquer : exécute les effets du plan et journalise chaque étape
 * dans l'historique du ticket (événements « automatisés »).
 */
export function applyAutomationPlan(
  data: WorkspaceData,
  plan: AutomationPlan,
  ctx: EngineContext,
): WorkspaceData {
  const nowIso = ctx.now.toISOString();
  let next = data;
  const events: TicketEvent[] = [];

  plan.steps.forEach((step, index) => {
    for (const effect of step.effects) next = applyEffect(next, effect, nowIso);
    const notification = step.effects.find((e) => e.type === "notification.prepare");
    events.push({
      id: ctx.newId("evt"),
      organizationId: data.organization.id,
      ticketId: plan.ticketId,
      // Décalage d'1 ms pour conserver l'ordre d'affichage des étapes.
      at: new Date(ctx.now.getTime() + index + 1).toISOString(),
      actor: { kind: "system" },
      kind: EVENT_KIND[step.kind],
      title: step.title,
      body:
        notification && notification.type === "notification.prepare"
          ? `À : ${notification.to}\nObjet : ${notification.subject}\n\n${notification.body}`
          : step.detail,
      automated: true,
    });
  });

  return { ...next, events: [...next.events, ...events] };
}
