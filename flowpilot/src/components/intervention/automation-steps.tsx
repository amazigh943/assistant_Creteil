import { Bell, CalendarPlus, Check, CircleDot, Mail, UserRoundCheck } from "lucide-react";
import type { AutomationStep, AutomationStepKind } from "@/core/automation/types";
import { cn } from "@/lib/utils";

export const STEP_ICON: Record<AutomationStepKind, React.ComponentType<{ className?: string }>> = {
  status: CircleDot,
  assignment: UserRoundCheck,
  reminder: Bell,
  planning: CalendarPlus,
  notification: Mail,
};

export function AutomationSteps({ steps, done = false }: { steps: AutomationStep[]; done?: boolean }) {
  if (steps.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucune automatisation pour cette issue.</p>;
  }
  return (
    <ol className="space-y-px">
      {steps.map((step, i) => {
        const Icon = STEP_ICON[step.kind];
        return (
          <li
            key={`${step.ruleId}-${i}`}
            className={cn(
              "flex gap-2.5 rounded-md px-2 py-1.5",
              done && "animate-in fade-in-0 slide-in-from-left-1 fill-mode-both",
            )}
            style={done ? { animationDelay: `${i * 70}ms` } : undefined}
          >
            <span
              className={cn(
                "mt-px flex size-5 shrink-0 items-center justify-center rounded-full",
                done ? "bg-flow text-flow-foreground" : "bg-surface-strong text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3" strokeWidth={3} /> : <Icon className="size-3" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm leading-5">{step.title}</span>
              {step.detail && <span className="block text-xs text-muted-foreground">{step.detail}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
