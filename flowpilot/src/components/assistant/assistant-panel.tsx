"use client";

import { ArrowRightLeft, Check, ChevronDown, Info, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TeamDot } from "@/components/common/agent-avatar";
import { PriorityIcon } from "@/components/tickets/priority-icon";
import { Button } from "@/components/ui/button";
import type { Ticket, WorkspaceData } from "@/core/domain/types";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/core/tickets/labels";
import { getAiServices, type TroubleshootingSuggestion } from "@/services/ai";
import { cn } from "@/lib/utils";
import { actions } from "@/store/workspace-store";

function Relevance({ level }: { level: TroubleshootingSuggestion["relevance"] }) {
  const n = { high: 3, medium: 2, low: 1 }[level];
  const label = { high: "Pertinence élevée", medium: "Pertinence moyenne", low: "Pertinence faible" }[level];
  return (
    <span className="flex items-center gap-0.5" title={label} aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("h-1.5 w-2.5 rounded-full", i < n ? "bg-flow" : "bg-border-strong")} />
      ))}
    </span>
  );
}

function SuggestionCard({
  suggestion,
  selectedActions,
  onToggleAction,
  defaultOpen,
}: {
  suggestion: TroubleshootingSuggestion;
  selectedActions: string[];
  onToggleAction: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [checked, setChecked] = useState<string[]>([]);
  return (
    <div className="rounded-lg border bg-background">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-5 font-medium">{suggestion.title}</span>
          <span className="mt-1 flex items-center gap-2 text-[11px] text-subtle">
            <span className="font-mono">{suggestion.articleRef}</span>
            <Relevance level={suggestion.relevance} />
          </span>
        </span>
        <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2.5 border-t px-3 pt-2.5 pb-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Cause probable · </span>
            {suggestion.probableCause}
          </p>
          <ol className="space-y-1">
            {suggestion.steps.map((step, i) => {
              const done = checked.includes(step.id);
              const added = step.quickActionId ? selectedActions.includes(step.quickActionId) : false;
              return (
                <li key={step.id} className="group flex items-start gap-2 text-xs">
                  <button
                    onClick={() =>
                      setChecked((c) => (c.includes(step.id) ? c.filter((x) => x !== step.id) : [...c, step.id]))
                    }
                    className={cn(
                      "mt-px flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold tabular transition-colors",
                      done ? "border-flow bg-flow text-flow-foreground" : "border-border-strong text-subtle",
                    )}
                    aria-label={done ? "Étape faite" : "Marquer l'étape comme faite"}
                  >
                    {done ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}
                  </button>
                  <span className={cn("flex-1 leading-4", done && "text-muted-foreground line-through decoration-border-strong")}>
                    {step.label}
                  </span>
                  {step.quickActionId && (
                    <button
                      onClick={() => onToggleAction(step.quickActionId!)}
                      className={cn(
                        "flex shrink-0 items-center gap-0.5 rounded px-1 text-[11px] transition-colors",
                        added ? "text-flow-strong" : "text-subtle hover:text-foreground",
                      )}
                      title={added ? "Retirer du compte rendu" : "Ajouter au compte rendu"}
                    >
                      {added ? <Check className="size-3" /> : <Plus className="size-3" />}
                      {added ? "Ajouté" : "Rapport"}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export function AssistantPanel({
  ticket,
  data,
  selectedActions,
  onToggleAction,
  onSuggestTransfer,
}: {
  ticket: Ticket;
  data: WorkspaceData;
  selectedActions: string[];
  onToggleAction: (id: string) => void;
  onSuggestTransfer: (teamId: string) => void;
}) {
  const { assistant } = getAiServices();
  const insight = useMemo(() => assistant.analyzeTicket({ ticket, data }), [assistant, ticket, data]);
  const c = insight.classification;
  const differs = c.category !== ticket.category || c.priority !== ticket.priority;
  const suggestedTeam = c.teamId ? data.teams.find((t) => t.id === c.teamId) : undefined;
  const otherTeam = suggestedTeam && suggestedTeam.id !== ticket.teamId ? suggestedTeam : undefined;
  const open = ticket.status !== "resolved";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-flow" />
        <h2 className="font-semibold">Assistant</h2>
        <span
          className="ml-auto rounded-md border border-dashed border-border-strong px-1.5 py-px text-[11px] text-muted-foreground"
          title="Aucune IA n'est connectée dans ce prototype"
        >
          Simulation
        </span>
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground">Analyse du ticket</h3>
        <div className="space-y-2 rounded-lg border bg-background p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Catégorie</span>
            <span className="font-medium">{CATEGORY_LABEL[c.category]}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Priorité</span>
            <span className="flex items-center gap-1.5 font-medium">
              <PriorityIcon priority={c.priority} className="size-3.5" />
              {PRIORITY_LABEL[c.priority]}
            </span>
          </div>
          {suggestedTeam && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Équipe compétente</span>
              <span className="flex items-center gap-1.5 font-medium">
                <TeamDot color={suggestedTeam.color} />
                {suggestedTeam.name}
              </span>
            </div>
          )}
          <p className="border-t pt-2 text-[11px] leading-4 text-subtle">Signaux : {c.signals.join(" · ")}</p>
          {open && differs && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => actions.reclassify(ticket.id, { category: c.category, priority: c.priority })}
            >
              Appliquer la classification
            </Button>
          )}
          {open && otherTeam && (
            <Button size="sm" variant="outline" className="w-full" onClick={() => onSuggestTransfer(otherTeam.id)}>
              <ArrowRightLeft /> Préparer un transfert vers {otherTeam.shortName}
            </Button>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground">Pistes de dépannage</h3>
        {insight.suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun article correspondant dans la base de connaissances.</p>
        ) : (
          insight.suggestions.map((s, i) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              selectedActions={selectedActions}
              onToggleAction={onToggleAction}
              defaultOpen={i === 0}
            />
          ))
        )}
      </section>

      {insight.similar.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Tickets similaires résolus</h3>
          <div className="divide-y rounded-lg border bg-background">
            {insight.similar.map((s) => (
              <Link
                key={s.ticketId}
                href={`/tickets/${s.reference}`}
                className="block px-3 py-2 transition-colors hover:bg-surface"
              >
                <span className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-subtle">{s.reference}</span>
                  <span className="truncate font-medium">{s.title}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[11px] text-muted-foreground">{s.resolution}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="flex gap-1.5 text-[11px] leading-4 text-subtle">
        <Info className="mt-px size-3 shrink-0" />
        Suggestions issues d&apos;une base de connaissances fictive, par correspondance de mots-clés. Aucun modèle
        d&apos;IA n&apos;est connecté.
      </p>
    </div>
  );
}
