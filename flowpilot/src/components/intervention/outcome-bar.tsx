"use client";

import { ArrowRightLeft, CalendarClock, CheckCircle2, PhoneMissed } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import type { InterventionOutcome } from "@/core/domain/types";
import { OUTCOME_LABEL } from "@/core/tickets/labels";
import { cn } from "@/lib/utils";

export const OUTCOMES: {
  id: InterventionOutcome;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  tone: string;
  key: string;
}[] = [
  {
    id: "resolved",
    icon: CheckCircle2,
    hint: "Clôture, e-mail, planning libéré",
    tone: "var(--s-resolved)",
    key: "1",
  },
  {
    id: "no_answer",
    icon: PhoneMissed,
    hint: "Relance et rappel programmés",
    tone: "var(--s-waiting)",
    key: "2",
  },
  {
    id: "follow_up",
    icon: CalendarClock,
    hint: "Créneau ajouté au planning",
    tone: "var(--s-scheduled)",
    key: "3",
  },
  {
    id: "transfer",
    icon: ArrowRightLeft,
    hint: "Attribution automatique",
    tone: "var(--p-high)",
    key: "4",
  },
];

export function OutcomeBar({
  value,
  onChange,
  disabled,
}: {
  value: InterventionOutcome | null;
  onChange: (o: InterventionOutcome) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-4" role="radiogroup" aria-label="Issue de l'intervention">
      {OUTCOMES.map(({ id, icon: Icon, hint, tone, key }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(id)}
            style={{ "--tone": tone } as React.CSSProperties}
            className={cn(
              "group relative flex flex-col items-start gap-1 rounded-lg border bg-background px-3 py-2.5 text-left shadow-xs transition-[border-color,background-color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-50",
              selected
                ? "border-[var(--tone)] bg-[color-mix(in_oklch,var(--tone)_7%,white)] shadow-[0_0_0_1px_var(--tone)]"
                : "border-border-strong hover:border-[color-mix(in_oklch,var(--tone)_55%,var(--border-strong))] hover:bg-surface",
            )}
          >
            <span className="flex w-full items-center gap-2">
              <Icon className="size-4 text-[var(--tone)]" />
              <span className="font-medium">{OUTCOME_LABEL[id]}</span>
              <Kbd className="ml-auto">{key}</Kbd>
            </span>
            <span className="pl-6 text-xs text-muted-foreground">{hint}</span>
          </button>
        );
      })}
    </div>
  );
}
