"use client";

import { ArrowRight, CheckCircle2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { AutomationPlan, AutomationStep } from "@/core/automation/types";
import type { InterventionInput, InterventionReport, Ticket } from "@/core/domain/types";
import { validateIntervention } from "@/core/intervention/commit";
import { OUTCOME_LABEL } from "@/core/tickets/labels";
import { nextTicketFor, ticketContext } from "@/core/tickets/queries";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { getAiServices } from "@/services/ai";
import { actions, getStoreState, useStore } from "@/store/workspace-store";
import { AutomationSteps } from "./automation-steps";
import { ComposeStep } from "./compose-step";
import { toInput, type InterventionDraft, type SlotOption } from "./draft";
import { OUTCOMES, OutcomeBar } from "./outcome-bar";
import { ReviewStep } from "./review-step";

type Stage =
  | { name: "compose" }
  | { name: "review"; input: InterventionInput; report: InterventionReport; plan: AutomationPlan }
  | { name: "done"; steps: AutomationStep[]; outcome: InterventionInput["outcome"]; nextRef?: string; nextTitle?: string };

export function InterventionPanel({
  ticket,
  draft,
  setDraft,
  slots,
  now,
}: {
  ticket: Ticket;
  draft: InterventionDraft;
  setDraft: (updater: (d: InterventionDraft) => InterventionDraft) => void;
  slots: SlotOption[];
  now: Date;
}) {
  const { data, currentAgentId, activeCall } = useStore();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ name: "compose" });
  const [errors, setErrors] = useState<string[]>([]);

  const selectOutcome = (outcome: InterventionDraft["outcome"]) => {
    setErrors([]);
    setDraft((d) => ({ ...d, outcome }));
  };

  const prepare = () => {
    if (!draft.outcome) return;
    if (activeCall?.ticketId === ticket.id) actions.endCall();
    const s = getStoreState();
    const input = toInput(draft, ticket.id, currentAgentId, s.callDurations[ticket.id] ?? 0)!;
    const problems = validateIntervention(s.data, input);
    if (problems.length > 0) return setErrors(problems);
    const tc = ticketContext(s.data, ticket);
    const report = getAiServices().reportComposer.compose({
      ticket,
      requester: tc.requester,
      company: tc.company,
      site: tc.site,
      agent: s.data.agents.find((a) => a.id === currentAgentId),
      targetTeam: s.data.teams.find((t) => t.id === input.transfer?.teamId),
      input,
      now,
    });
    setStage({ name: "review", input, report, plan: actions.previewAutomations(input) });
  };

  const confirm = () => {
    if (stage.name !== "review") return;
    const report = {
      ...stage.report,
      actions: stage.report.actions.map((a) => a.trim()).filter(Boolean),
    };
    try {
      actions.commitIntervention(stage.input, report, stage.plan);
    } catch (e) {
      toast.error("Enregistrement impossible", { description: (e as Error).message });
      return;
    }
    const next = nextTicketFor(getStoreState().data, currentAgentId, now, ticket.id);
    setStage({
      name: "done",
      steps: stage.plan.steps,
      outcome: stage.input.outcome,
      nextRef: next?.reference,
      nextTitle: next?.title,
    });
    toast.success(`${ticket.reference} · ${OUTCOME_LABEL[stage.input.outcome]}`, {
      description: `Compte rendu enregistré · ${stage.plan.steps.length} automatisation${stage.plan.steps.length > 1 ? "s" : ""} exécutée${stage.plan.steps.length > 1 ? "s" : ""}.`,
    });
  };

  const goNext = () => {
    if (stage.name === "done" && stage.nextRef) router.push(`/tickets/${stage.nextRef}`);
  };

  const canAct = ticket.status !== "resolved" && stage.name !== "done";

  useHotkeys({
    ...Object.fromEntries(
      OUTCOMES.map((o) => [o.key, () => canAct && stage.name === "compose" && selectOutcome(o.id)]),
    ),
    "mod+enter": () => (stage.name === "review" ? confirm() : stage.name === "compose" && prepare()),
    escape: () => {
      if (stage.name === "review") setStage({ name: "compose" });
      else if (stage.name === "compose" && draft.outcome) selectOutcome(null);
    },
    n: goNext,
  });

  if (stage.name === "done") {
    return (
      <section className="rounded-xl border bg-background p-5 shadow-xs animate-in fade-in-0 slide-in-from-bottom-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-flow" />
          <h2 className="font-semibold">Intervention enregistrée</h2>
          <span className="text-muted-foreground">· {OUTCOME_LABEL[stage.outcome]}</span>
        </div>
        <div className="mt-3 rounded-lg bg-surface p-2">
          <AutomationSteps steps={stage.steps} done />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" asChild>
            <Link href="/">Retour à ma journée</Link>
          </Button>
          {stage.nextRef ? (
            <Button onClick={goNext} className="max-w-full">
              <span className="truncate">
                Ticket suivant : <span className="font-mono">{stage.nextRef}</span>
                <span className="hidden font-normal opacity-70 sm:inline"> — {stage.nextTitle}</span>
              </span>
              <ArrowRight />
              <Kbd className="border-white/25">N</Kbd>
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">Votre file est vide. Bravo.</span>
          )}
        </div>
      </section>
    );
  }

  if (ticket.status === "resolved") {
    return (
      <section className="flex items-center gap-2 rounded-xl border bg-surface px-4 py-3 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-flow" /> Ce ticket est résolu. Le compte rendu figure dans l&apos;historique.
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-background shadow-xs">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
        <h2 className="font-semibold">Intervention</h2>
        {draft.outcome && stage.name === "compose" && (
          <Button variant="ghost" size="sm" onClick={() => selectOutcome(null)}>
            <X /> Annuler
          </Button>
        )}
      </div>
      <div className="px-4 pb-4">
        {stage.name === "compose" && (
          <OutcomeBar value={draft.outcome} onChange={selectOutcome} />
        )}
        {stage.name === "compose" && draft.outcome && (
          <div className="mt-4 border-t pt-4 animate-in fade-in-0">
            <ComposeStep
              ticket={ticket}
              data={data}
              draft={draft}
              setDraft={setDraft}
              slots={slots}
              now={now}
              onSubmit={prepare}
              errors={errors}
            />
          </div>
        )}
        {stage.name === "review" && (
          <ReviewStep
            report={stage.report}
            setReport={(report) => setStage({ ...stage, report })}
            plan={stage.plan}
            onBack={() => setStage({ name: "compose" })}
            onConfirm={confirm}
          />
        )}
      </div>
    </section>
  );
}
