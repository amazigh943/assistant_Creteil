import type { TicketPriority } from "@/core/domain/types";
import { PRIORITY_LABEL } from "@/core/tickets/labels";
import { cn } from "@/lib/utils";

const LEVEL: Record<TicketPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const COLOR: Record<TicketPriority, string> = {
  critical: "var(--p-critical)",
  high: "var(--p-high)",
  medium: "var(--p-medium)",
  low: "var(--p-low)",
};

export function PriorityIcon({ priority, className }: { priority: TicketPriority; className?: string }) {
  if (priority === "critical") {
    return (
      <svg viewBox="0 0 16 16" className={cn("size-4 shrink-0", className)} role="img" aria-label={PRIORITY_LABEL[priority]}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" fill={COLOR.critical} />
        <rect x="7.1" y="4.2" width="1.8" height="5.2" rx="0.9" fill="white" />
        <circle cx="8" cy="11.4" r="1" fill="white" />
      </svg>
    );
  }
  const level = LEVEL[priority];
  return (
    <svg viewBox="0 0 16 16" className={cn("size-4 shrink-0", className)} role="img" aria-label={PRIORITY_LABEL[priority]}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={2.5 + i * 4}
          y={10 - i * 3}
          width="3"
          height={4 + i * 3}
          rx="1"
          fill={i < level ? COLOR[priority] : "var(--border-strong)"}
        />
      ))}
    </svg>
  );
}
