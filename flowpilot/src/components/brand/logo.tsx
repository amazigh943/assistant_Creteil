import { cn } from "@/lib/utils";

/** Monogramme FlowPilot : une trajectoire qui file vers un point d'arrivée. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)}>
      <rect width="24" height="24" rx="6.5" fill="var(--primary)" />
      <path
        d="M6 16.5c3.2 0 4.4-2.1 5.6-4.5S14.3 7.5 17.5 7.5"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeOpacity="0.55"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="17.6" cy="7.5" r="2.3" fill="var(--flow)" />
      <circle cx="6" cy="16.5" r="1.3" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-[-0.02em]">
        FlowPilot
      </span>
    </span>
  );
}
