import type { EngineContext, Id, Ticket, WorkspaceData } from "../domain/types";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "./labels";

/** Applique une (re)classification validée par l'agent et la journalise. */
export function reclassifyTicket(
  data: WorkspaceData,
  ticketId: Id,
  patch: Partial<Pick<Ticket, "category" | "priority">>,
  agentId: Id,
  ctx: EngineContext,
  source: "assistant" | "agent" = "agent",
): WorkspaceData {
  const ticket = data.tickets.find((t) => t.id === ticketId);
  if (!ticket) return data;
  const changes: string[] = [];
  if (patch.category && patch.category !== ticket.category)
    changes.push(`catégorie : ${CATEGORY_LABEL[patch.category]}`);
  if (patch.priority && patch.priority !== ticket.priority)
    changes.push(`priorité : ${PRIORITY_LABEL[patch.priority]}`);
  if (changes.length === 0) return data;

  return {
    ...data,
    tickets: data.tickets.map((t) =>
      t.id === ticketId ? { ...t, ...patch, updatedAt: ctx.now.toISOString() } : t,
    ),
    events: [
      ...data.events,
      {
        id: ctx.newId("evt"),
        organizationId: data.organization.id,
        ticketId,
        at: ctx.now.toISOString(),
        actor: { kind: "agent", agentId },
        kind: "status_changed",
        title: `Classification mise à jour — ${changes.join(", ")}`,
        body: source === "assistant" ? "Suggestion de l'assistant validée par l'agent." : undefined,
        automated: false,
      },
    ],
  };
}
