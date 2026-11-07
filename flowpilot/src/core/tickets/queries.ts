import type { Id, Ticket, WorkspaceData } from "../domain/types";
import { computeUrgency, isOpen, type Urgency } from "./urgency";

export function findTicket(data: WorkspaceData, ticketId: Id): Ticket | undefined {
  return data.tickets.find((t) => t.id === ticketId);
}

export function findTicketByReference(data: WorkspaceData, reference: string): Ticket | undefined {
  const ref = reference.toUpperCase();
  return data.tickets.find((t) => t.reference === ref);
}

export function requesterOf(data: WorkspaceData, ticket: Ticket) {
  return data.requesters.find((r) => r.id === ticket.requesterId);
}

export interface TicketContext {
  ticket: Ticket;
  requester: WorkspaceData["requesters"][number] | undefined;
  company: WorkspaceData["companies"][number] | undefined;
  site: WorkspaceData["sites"][number] | undefined;
  team: WorkspaceData["teams"][number] | undefined;
  assignee: WorkspaceData["agents"][number] | undefined;
}

export function ticketContext(data: WorkspaceData, ticket: Ticket): TicketContext {
  const requester = requesterOf(data, ticket);
  return {
    ticket,
    requester,
    company: requester ? data.companies.find((c) => c.id === requester.companyId) : undefined,
    site: requester ? data.sites.find((s) => s.id === requester.siteId) : undefined,
    team: data.teams.find((t) => t.id === ticket.teamId),
    assignee: ticket.assigneeId ? data.agents.find((a) => a.id === ticket.assigneeId) : undefined,
  };
}

export interface RankedTicket {
  ticket: Ticket;
  urgency: Urgency;
}

/** File de travail d'un agent, triée par urgence décroissante. */
export function agentQueue(data: WorkspaceData, agentId: Id, now: Date): RankedTicket[] {
  return rankTickets(
    data,
    data.tickets.filter((t) => t.assigneeId === agentId && isOpen(t)),
    now,
  );
}

export function rankTickets(data: WorkspaceData, tickets: Ticket[], now: Date): RankedTicket[] {
  return tickets
    .map((ticket) => ({
      ticket,
      urgency: computeUrgency(ticket, now, requesterOf(data, ticket)),
    }))
    .sort(
      (a, b) =>
        b.urgency.score - a.urgency.score ||
        new Date(a.ticket.dueAt).getTime() - new Date(b.ticket.dueAt).getTime(),
    );
}

/**
 * Prochain ticket à traiter pour l'agent : le plus urgent de sa file,
 * en excluant le ticket courant et ceux qui attendent un créneau ou une réponse.
 */
export function nextTicketFor(
  data: WorkspaceData,
  agentId: Id,
  now: Date,
  excludeTicketId?: Id,
): Ticket | undefined {
  return agentQueue(data, agentId, now).find(
    ({ ticket }) =>
      ticket.id !== excludeTicketId &&
      ticket.status !== "waiting" &&
      ticket.status !== "scheduled",
  )?.ticket;
}

export function openTicketCountByAgent(data: WorkspaceData): Map<Id, number> {
  const counts = new Map<Id, number>();
  for (const agent of data.agents) counts.set(agent.id, 0);
  for (const t of data.tickets) {
    if (t.assigneeId && isOpen(t)) counts.set(t.assigneeId, (counts.get(t.assigneeId) ?? 0) + 1);
  }
  return counts;
}

export function eventsOf(data: WorkspaceData, ticketId: Id) {
  return data.events
    .filter((e) => e.ticketId === ticketId)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}
