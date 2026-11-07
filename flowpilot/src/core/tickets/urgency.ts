import type { Requester, Ticket, TicketPriority, TicketStatus } from "../domain/types";

const PRIORITY_WEIGHT: Record<TicketPriority, number> = {
  critical: 100,
  high: 60,
  medium: 30,
  low: 10,
};

export const OPEN_STATUSES: readonly TicketStatus[] = [
  "new",
  "open",
  "in_progress",
  "waiting",
  "scheduled",
];

export function isOpen(ticket: Pick<Ticket, "status">): boolean {
  return ticket.status !== "resolved";
}

export type SlaState = "ok" | "soon" | "breached" | "met";

/** État du SLA : « soon » lorsque l'échéance tombe dans les 2 prochaines heures. */
export function slaState(ticket: Ticket, now: Date): SlaState {
  if (ticket.status === "resolved") return "met";
  const remainingMs = new Date(ticket.dueAt).getTime() - now.getTime();
  if (remainingMs <= 0) return "breached";
  if (remainingMs <= 2 * 60 * 60 * 1000) return "soon";
  return "ok";
}

export interface UrgencyReason {
  code: "priority" | "sla_breached" | "sla_soon" | "vip" | "attempts" | "in_progress";
  label: string;
}

export interface Urgency {
  score: number;
  reasons: UrgencyReason[];
}

/**
 * Score d'urgence déterministe utilisé pour ordonner la file de l'agent.
 * Pondère la priorité, la proximité du SLA, le statut VIP du demandeur
 * et les tentatives d'appel déjà effectuées.
 */
export function computeUrgency(
  ticket: Ticket,
  now: Date,
  requester?: Pick<Requester, "vip">,
): Urgency {
  const reasons: UrgencyReason[] = [];
  let score = PRIORITY_WEIGHT[ticket.priority];

  if (ticket.priority === "critical") {
    reasons.push({ code: "priority", label: "Critique" });
  }

  const sla = slaState(ticket, now);
  if (sla === "breached") {
    score += 80;
    reasons.push({ code: "sla_breached", label: "SLA dépassé" });
  } else if (sla === "soon") {
    const minutes = Math.max(
      1,
      Math.round((new Date(ticket.dueAt).getTime() - now.getTime()) / 60000),
    );
    score += 40 + Math.max(0, 120 - minutes) / 3;
    reasons.push({
      code: "sla_soon",
      label: minutes < 60 ? `SLA dans ${minutes} min` : `SLA dans ${Math.round(minutes / 60)} h`,
    });
  }

  if (requester?.vip) {
    score += 15;
    reasons.push({ code: "vip", label: "VIP" });
  }

  if (ticket.status === "in_progress") {
    score += 20;
    reasons.push({ code: "in_progress", label: "En cours" });
  }

  if (ticket.callAttempts > 0) {
    score += 5 * ticket.callAttempts;
    reasons.push({
      code: "attempts",
      label: `${ticket.callAttempts} tentative${ticket.callAttempts > 1 ? "s" : ""}`,
    });
  }

  // Les tickets en attente ou planifiés ne doivent pas monopoliser la file.
  if (ticket.status === "waiting" || ticket.status === "scheduled") score -= 70;

  return { score: Math.round(score), reasons };
}
