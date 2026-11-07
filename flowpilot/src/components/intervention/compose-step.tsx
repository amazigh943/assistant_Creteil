"use client";

import { Check, Mic, Plus } from "lucide-react";
import { AgentAvatar, TeamDot } from "@/components/common/agent-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_CALL_ATTEMPTS, pickAssignee } from "@/core/automation/rules";
import type { FollowUpMode, Ticket, WorkspaceData } from "@/core/domain/types";
import { formatSlot } from "@/core/planning/format";
import { FOLLOW_UP_MODE_LABEL } from "@/core/tickets/labels";
import { quickActionById, quickActionsFor, TRANSFER_REASONS } from "@/core/tickets/quick-actions";
import { openTicketCountByAgent } from "@/core/tickets/queries";
import { toLocalInputValue } from "@/lib/time";
import { cn, fullName } from "@/lib/utils";
import { DEFAULT_DURATION, type InterventionDraft, type SlotOption } from "./draft";

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
        selected
          ? "border-flow bg-flow-soft font-medium text-flow-strong"
          : "border-border-strong bg-background text-muted-foreground hover:border-subtle hover:text-foreground",
      )}
    >
      {selected ? <Check className="size-3" strokeWidth={2.5} /> : <Plus className="size-3" />}
      {children}
    </button>
  );
}

function Field({ label, children, aside }: { label: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

export function ComposeStep({
  ticket,
  data,
  draft,
  setDraft,
  slots,
  now,
  onSubmit,
  errors,
}: {
  ticket: Ticket;
  data: WorkspaceData;
  draft: InterventionDraft;
  setDraft: (updater: (d: InterventionDraft) => InterventionDraft) => void;
  slots: SlotOption[];
  now: Date;
  onSubmit: () => void;
  errors: string[];
}) {
  const outcome = draft.outcome!;
  const catalog = quickActionsFor(ticket.category, outcome);
  // Actions ajoutées depuis l'assistant mais absentes du catalogue de cette issue.
  const extra = draft.quickActionIds
    .filter((id) => !catalog.some((a) => a.id === id))
    .map((id) => quickActionById(id))
    .filter((a) => a !== undefined);

  const counts = openTicketCountByAgent(data);
  const target = draft.transfer.teamId ? pickAssignee({ data }, draft.transfer.teamId) : undefined;

  return (
    <div className="space-y-5">
      <Field label={outcome === "no_answer" ? "Constat" : "Actions réalisées"}>
        <div className="flex flex-wrap gap-1.5">
          {[...catalog, ...extra].map((a) => (
            <Chip
              key={a.id}
              selected={draft.quickActionIds.includes(a.id)}
              onClick={() => setDraft((d) => ({ ...d, quickActionIds: toggle(d.quickActionIds, a.id) }))}
            >
              {a.label}
            </Chip>
          ))}
        </div>
      </Field>

      {outcome === "no_answer" && (
        <p className="rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
          Tentative <span className="font-medium text-foreground">{ticket.callAttempts + 1}</span> sur{" "}
          {MAX_CALL_ATTEMPTS}.{" "}
          {ticket.callAttempts + 1 >= MAX_CALL_ATTEMPTS
            ? "FlowPilot préparera une dernière relance et vous proposera la clôture."
            : "FlowPilot programmera un rappel au prochain créneau libre et préviendra l'utilisateur par e-mail."}
        </p>
      )}

      {outcome === "follow_up" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Suite prévue">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(FOLLOW_UP_MODE_LABEL) as FollowUpMode[]).map((mode) => (
                <Chip
                  key={mode}
                  selected={draft.followUp.mode === mode}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      followUp: { ...d.followUp, mode, durationMin: DEFAULT_DURATION[mode] },
                    }))
                  }
                >
                  {FOLLOW_UP_MODE_LABEL[mode]}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Durée">
            <div className="flex gap-1.5">
              {[15, 30, 60, 90].map((min) => (
                <Chip
                  key={min}
                  selected={draft.followUp.durationMin === min}
                  onClick={() => setDraft((d) => ({ ...d, followUp: { ...d.followUp, durationMin: min } }))}
                >
                  {min} min
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Créneau" aside={<span className="text-[11px] text-subtle">Calculé sur votre planning</span>}>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((s) => (
                <Chip
                  key={s.id}
                  selected={new Date(draft.followUp.start).getTime() === s.start.getTime()}
                  onClick={() => setDraft((d) => ({ ...d, followUp: { ...d.followUp, start: s.start.toISOString() } }))}
                >
                  {s.label} · {formatSlot(s.start, now)}
                </Chip>
              ))}
            </div>
          </Field>
          <Field label="Ou choisir une date">
            <Input
              type="datetime-local"
              step={900}
              value={toLocalInputValue(new Date(draft.followUp.start))}
              onChange={(e) => {
                if (!e.target.value) return;
                const start = new Date(e.target.value).toISOString();
                setDraft((d) => ({ ...d, followUp: { ...d.followUp, start } }));
              }}
              className="w-56"
            />
          </Field>
        </div>
      )}

      {outcome === "transfer" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Équipe destinataire">
            <div className="space-y-1">
              {data.teams
                .filter((t) => t.id !== ticket.teamId)
                .map((team) => (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, transfer: { ...d.transfer, teamId: team.id } }))}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md border px-2.5 py-2 text-left text-sm transition-colors",
                      draft.transfer.teamId === team.id
                        ? "border-flow bg-flow-soft"
                        : "border-border-strong hover:bg-surface",
                    )}
                  >
                    <TeamDot color={team.color} />
                    <span className="font-medium">{team.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{team.description}</span>
                  </button>
                ))}
            </div>
          </Field>
          <div className="space-y-4">
            <Field label="Motif">
              <div className="flex flex-wrap gap-1.5">
                {TRANSFER_REASONS.map((r) => (
                  <Chip
                    key={r.id}
                    selected={draft.transfer.reasonIds.includes(r.id)}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        transfer: { ...d.transfer, reasonIds: toggle(d.transfer.reasonIds, r.id) },
                      }))
                    }
                  >
                    {r.label}
                  </Chip>
                ))}
              </div>
            </Field>
            {target && (
              <div className="flex items-center gap-2.5 rounded-md bg-surface px-3 py-2 text-xs">
                <AgentAvatar
                  agent={target}
                  teamColor={data.teams.find((t) => t.id === target.teamId)?.color}
                  size="sm"
                  showPresence
                />
                <span className="text-muted-foreground">
                  Sera attribué à <span className="font-medium text-foreground">{fullName(target)}</span> —
                  agent disponible le moins chargé ({counts.get(target.id) ?? 0} ticket
                  {(counts.get(target.id) ?? 0) > 1 ? "s" : ""} ouvert{(counts.get(target.id) ?? 0) > 1 ? "s" : ""})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <Field label="Note rapide" aside={<span className="text-[11px] text-subtle">Les abréviations courantes sont développées</span>}>
        <div className="relative">
          <Textarea
            value={draft.note}
            onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            placeholder="Ex. : pb réglé après purge du cache, util. confirme que tout fonctionne"
            className="min-h-20 pr-10"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="absolute top-2 right-2">
                <Button type="button" variant="ghost" size="icon-sm" disabled aria-label="Dictée vocale (bientôt)">
                  <Mic />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">Dictée vocale : prévue dans une prochaine version</TooltipContent>
          </Tooltip>
        </div>
      </Field>

      {errors.length > 0 && (
        <p className="text-xs text-destructive" role="alert">
          {errors.join(" ")}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button onClick={onSubmit}>
          Préparer le compte rendu <Kbd className="ml-1 border-white/25">⌘↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
