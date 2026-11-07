"use client";

import Link from "next/link";
import { AgentAvatar } from "@/components/common/agent-avatar";
import type { Ticket, WorkspaceData } from "@/core/domain/types";
import { ticketContext } from "@/core/tickets/queries";
import { slaState, type UrgencyReason } from "@/core/tickets/urgency";
import { formatCountdown, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import { PriorityIcon } from "./priority-icon";
import { StatusIcon } from "./status-icon";

export function SlaChip({ ticket, now, always = false }: { ticket: Ticket; now: Date; always?: boolean }) {
  const state = slaState(ticket, now);
  if (state === "met") return null;
  if (state === "ok" && !always) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-px text-xs font-medium tabular whitespace-nowrap",
        state === "breached" && "bg-[oklch(0.97_0.02_25)] text-[oklch(0.52_0.18_25)]",
        state === "soon" && "bg-warning-soft text-[oklch(0.5_0.12_60)]",
        state === "ok" && "bg-muted text-muted-foreground",
      )}
    >
      {state === "breached" ? "SLA dépassé" : `SLA ${formatCountdown(ticket.dueAt, now)}`}
    </span>
  );
}

export function ReasonChips({ reasons }: { reasons: UrgencyReason[] }) {
  const shown = reasons.filter((r) => r.code === "vip" || r.code === "attempts");
  return (
    <>
      {shown.map((r) => (
        <span
          key={r.code}
          className="rounded-md bg-muted px-1.5 py-px text-xs whitespace-nowrap text-muted-foreground"
        >
          {r.label}
        </span>
      ))}
    </>
  );
}

export function TicketRow({
  ticket,
  data,
  now,
  reasons,
  showAssignee = true,
  trailing,
  active,
  className,
}: {
  ticket: Ticket;
  data: WorkspaceData;
  now: Date;
  reasons?: UrgencyReason[];
  showAssignee?: boolean;
  trailing?: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  const { requester, company, assignee, team } = ticketContext(data, ticket);
  return (
    <div
      className={cn(
        "group relative flex h-11 items-center gap-3 px-6 transition-colors hover:bg-surface",
        active && "bg-surface",
        className,
      )}
    >
      <Link
        href={`/tickets/${ticket.reference}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`${ticket.reference} — ${ticket.title}`}
      />
      <PriorityIcon priority={ticket.priority} />
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{ticket.reference}</span>
      <StatusIcon status={ticket.status} />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-foreground">{ticket.title}</span>
        {requester && (
          <span className="ml-2 text-muted-foreground">
            {requester.firstName} {requester.lastName}
            {company && <span className="text-subtle"> · {company.name}</span>}
          </span>
        )}
      </span>
      <span className="hidden items-center gap-1.5 lg:flex">
        {reasons && <ReasonChips reasons={reasons} />}
        <SlaChip ticket={ticket} now={now} />
      </span>
      {trailing && <span className="relative z-10">{trailing}</span>}
      {showAssignee && (
        <span className="w-6 shrink-0">
          {assignee ? (
            <AgentAvatar agent={assignee} teamColor={team?.color} size="xs" />
          ) : (
            <span
              className="inline-block size-5 rounded-full border border-dashed border-border-strong"
              title="Non attribué"
            />
          )}
        </span>
      )}
      <span className="w-20 shrink-0 text-right text-xs text-subtle tabular">
        {formatRelative(ticket.updatedAt, now)}
      </span>
    </div>
  );
}
