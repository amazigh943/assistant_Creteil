import { AgentAvatar, TeamDot } from "@/components/common/agent-avatar";
import { PriorityIcon } from "@/components/tickets/priority-icon";
import { StatusLabel } from "@/components/tickets/status-icon";
import { SlaChip } from "@/components/tickets/ticket-row";
import { CATEGORY_LABEL, CHANNEL_LABEL, PRIORITY_LABEL } from "@/core/tickets/labels";
import type { TicketContext } from "@/core/tickets/queries";
import { formatRelative, formatShortDateTime } from "@/lib/time";
import { fullName } from "@/lib/utils";

export function TicketProperties({ ctx, now }: { ctx: TicketContext; now: Date }) {
  const { ticket, team, assignee } = ctx;
  const rows: [string, React.ReactNode][] = [
    ["Statut", <StatusLabel key="s" status={ticket.status} />],
    [
      "Priorité",
      <span key="p" className="inline-flex items-center gap-1.5">
        <PriorityIcon priority={ticket.priority} className="size-3.5" />
        {PRIORITY_LABEL[ticket.priority]}
      </span>,
    ],
    ["Catégorie", CATEGORY_LABEL[ticket.category]],
    [
      "Équipe",
      team ? (
        <span key="t" className="inline-flex items-center gap-1.5">
          <TeamDot color={team.color} />
          {team.name}
        </span>
      ) : (
        "—"
      ),
    ],
    [
      "Attribué à",
      assignee ? (
        <span key="a" className="inline-flex items-center gap-1.5">
          <AgentAvatar agent={assignee} teamColor={team?.color} size="xs" />
          {fullName(assignee)}
        </span>
      ) : (
        <span className="text-subtle">Non attribué</span>
      ),
    ],
    [
      "Échéance",
      <span key="d" className="inline-flex items-center gap-1.5">
        <span className="tabular">{formatShortDateTime(ticket.dueAt, now)}</span>
        <SlaChip ticket={ticket} now={now} />
      </span>,
    ],
    ["Canal", CHANNEL_LABEL[ticket.channel]],
    ["Créé", <span key="c" title={new Date(ticket.createdAt).toLocaleString("fr-FR")}>{formatRelative(ticket.createdAt, now)}</span>],
  ];
  if (ticket.callAttempts > 0) rows.push(["Tentatives", `${ticket.callAttempts} sans réponse`]);

  return (
    <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 truncate">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
