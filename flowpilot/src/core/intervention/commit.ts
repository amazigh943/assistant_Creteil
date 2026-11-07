import { applyAutomationPlan, planAutomations } from "../automation/engine";
import type { AutomationPlan } from "../automation/types";
import type {
  EngineContext,
  Id,
  InterventionInput,
  InterventionReport,
  TicketEvent,
  WorkspaceData,
} from "../domain/types";
import { OUTCOME_LABEL } from "../tickets/labels";

export class InterventionError extends Error {}

export function validateIntervention(data: WorkspaceData, input: InterventionInput): string[] {
  const errors: string[] = [];
  const ticket = data.tickets.find((t) => t.id === input.ticketId);
  if (!ticket) errors.push("Ticket introuvable.");
  if (ticket?.status === "resolved") errors.push("Ce ticket est déjà résolu.");
  if (!data.agents.some((a) => a.id === input.agentId)) errors.push("Agent inconnu.");
  if (input.outcome === "transfer") {
    if (!input.transfer?.teamId) errors.push("Choisissez une équipe destinataire.");
    else if (input.transfer.teamId === ticket?.teamId)
      errors.push("Le ticket est déjà dans cette équipe.");
  }
  if (input.outcome === "follow_up") {
    if (!input.followUp?.start) errors.push("Choisissez un créneau pour la suite.");
    if (input.followUp && input.followUp.durationMin <= 0) errors.push("Durée invalide.");
  }
  return errors;
}

export interface CommitResult {
  data: WorkspaceData;
  plan: AutomationPlan;
}

/**
 * Enregistre une intervention validée par l'agent :
 * 1. ajoute le compte rendu à l'historique ;
 * 2. exécute le plan d'automatisation (celui présenté à l'agent, s'il est fourni).
 */
export function commitIntervention(
  data: WorkspaceData,
  input: InterventionInput,
  report: InterventionReport,
  ctx: EngineContext,
  previewedPlan?: AutomationPlan,
): CommitResult {
  const errors = validateIntervention(data, input);
  if (errors.length > 0) throw new InterventionError(errors.join(" "));

  const plan = previewedPlan ?? planAutomations(data, input, ctx);
  if (plan.ticketId !== input.ticketId) throw new InterventionError("Plan incohérent.");

  const reportEvent: TicketEvent = {
    id: ctx.newId("evt"),
    organizationId: data.organization.id,
    ticketId: input.ticketId,
    at: ctx.now.toISOString(),
    actor: { kind: "agent", agentId: input.agentId },
    kind: "report",
    title: OUTCOME_LABEL[input.outcome],
    report,
    automated: false,
  };

  const withReport: WorkspaceData = {
    ...data,
    events: [...data.events, reportEvent],
    tickets: data.tickets.map((t) =>
      t.id === input.ticketId ? { ...t, updatedAt: ctx.now.toISOString() } : t,
    ),
  };

  return { data: applyAutomationPlan(withReport, plan, ctx), plan };
}

/**
 * L'agent prend le ticket en main (ouverture de l'appel, par exemple) :
 * passage en « En cours » et attribution s'il n'était pas attribué.
 */
export function startWork(
  data: WorkspaceData,
  ticketId: Id,
  agentId: Id,
  ctx: EngineContext,
): WorkspaceData {
  const ticket = data.tickets.find((t) => t.id === ticketId);
  if (!ticket || ticket.status === "in_progress" || ticket.status === "resolved") return data;
  if (ticket.assigneeId && ticket.assigneeId !== agentId) return data;

  const nowIso = ctx.now.toISOString();
  const events: TicketEvent[] = [];
  if (!ticket.assigneeId) {
    const agent = data.agents.find((a) => a.id === agentId);
    events.push({
      id: ctx.newId("evt"),
      organizationId: data.organization.id,
      ticketId,
      at: nowIso,
      actor: { kind: "agent", agentId },
      kind: "assigned",
      title: `Pris en charge par ${agent ? `${agent.firstName} ${agent.lastName}` : "l'agent"}`,
      automated: false,
    });
  }
  events.push({
    id: ctx.newId("evt"),
    organizationId: data.organization.id,
    ticketId,
    at: new Date(ctx.now.getTime() + 1).toISOString(),
    actor: { kind: "system" },
    kind: "status_changed",
    title: "Statut passé à « En cours »",
    automated: true,
  });

  return {
    ...data,
    tickets: data.tickets.map((t) =>
      t.id === ticketId
        ? { ...t, status: "in_progress", assigneeId: agentId, updatedAt: nowIso }
        : t,
    ),
    events: [...data.events, ...events],
  };
}

export function setReminderDone(data: WorkspaceData, reminderId: Id, done: boolean): WorkspaceData {
  return {
    ...data,
    reminders: data.reminders.map((r) => (r.id === reminderId ? { ...r, done } : r)),
  };
}
