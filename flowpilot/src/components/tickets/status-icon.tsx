import type { TicketStatus } from "@/core/domain/types";
import { STATUS_LABEL } from "@/core/tickets/labels";
import { cn } from "@/lib/utils";

export const STATUS_COLOR: Record<TicketStatus, string> = {
  new: "var(--s-new)",
  open: "var(--s-open)",
  in_progress: "var(--s-progress)",
  waiting: "var(--s-waiting)",
  scheduled: "var(--s-scheduled)",
  resolved: "var(--s-resolved)",
};

export function StatusIcon({ status, className }: { status: TicketStatus; className?: string }) {
  const c = STATUS_COLOR[status];
  return (
    <svg viewBox="0 0 16 16" className={cn("size-3.5 shrink-0", className)} role="img" aria-label={STATUS_LABEL[status]}>
      {status === "new" && (
        <circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="2.6 2.1" />
      )}
      {status === "open" && <circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.6" />}
      {status === "in_progress" && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.6" />
          <path d="M8 4.5a3.5 3.5 0 0 1 0 7z" fill={c} />
        </>
      )}
      {status === "waiting" && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.6" />
          <rect x="5.9" y="5.3" width="1.5" height="5.4" rx="0.6" fill={c} />
          <rect x="8.6" y="5.3" width="1.5" height="5.4" rx="0.6" fill={c} />
        </>
      )}
      {status === "scheduled" && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke={c} strokeWidth="1.6" />
          <path d="M8 5v3.2l2.1 1.3" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {status === "resolved" && (
        <>
          <circle cx="8" cy="8" r="7" fill={c} />
          <path d="M5 8.2l2 2 4-4.2" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export function StatusLabel({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <StatusIcon status={status} />
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}
