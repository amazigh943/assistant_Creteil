"use client";

import { Bell, CalendarPlus, CircleDot, FileText, Mail, MessageSquare, PhoneCall, Plus, UserRoundCheck, Zap } from "lucide-react";
import { AgentAvatar } from "@/components/common/agent-avatar";
import type { TicketEvent, TicketEventKind, WorkspaceData } from "@/core/domain/types";
import { OUTCOME_LABEL } from "@/core/tickets/labels";
import { formatRelative, formatShortDateTime } from "@/lib/time";
import { cn, fullName } from "@/lib/utils";

const ICON: Record<TicketEventKind, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  call: PhoneCall,
  note: MessageSquare,
  status_changed: CircleDot,
  assigned: UserRoundCheck,
  report: FileText,
  reminder: Bell,
  planning: CalendarPlus,
  notification: Mail,
};

function actorName(e: TicketEvent, data: WorkspaceData) {
  if (e.actor.kind === "system") return "FlowPilot";
  if (e.actor.kind === "requester") {
    const id = e.actor.requesterId;
    const r = data.requesters.find((x) => x.id === id);
    return r ? fullName(r) : "Demandeur";
  }
  const id = e.actor.agentId;
  const a = data.agents.find((x) => x.id === id);
  return a ? fullName(a) : "Agent";
}

function ReportCard({ event, data, now }: { event: TicketEvent; data: WorkspaceData; now: Date }) {
  const r = event.report!;
  const agent = event.actor.kind === "agent" ? data.agents.find((a) => a.id === (event.actor as { agentId: string }).agentId) : undefined;
  const team = agent ? data.teams.find((t) => t.id === agent.teamId) : undefined;
  return (
    <li className="relative pl-9">
      <span className="absolute top-2.5 left-0">
        {agent ? <AgentAvatar agent={agent} teamColor={team?.color} size="sm" /> : null}
      </span>
      <div className="rounded-lg border bg-background">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-b px-3 py-2 text-xs">
          <span className="font-medium text-foreground">{actorName(event, data)}</span>
          <span className="text-muted-foreground">— {OUTCOME_LABEL[r.outcome]}</span>
          {r.durationMin > 0 && <span className="text-subtle">· {r.durationMin} min</span>}
          {r.editedByAgent && <span className="text-subtle">· compte rendu corrigé</span>}
          <time className="ml-auto text-subtle" title={new Date(event.at).toLocaleString("fr-FR")}>
            {formatShortDateTime(event.at, now)}
          </time>
        </div>
        <div className="space-y-2 px-3 py-2.5 text-sm">
          <p className="font-medium">{r.summary}</p>
          {r.context && <p className="text-muted-foreground">{r.context}</p>}
          {r.actions.length > 0 && (
            <ul className="space-y-0.5">
              {r.actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-muted-foreground">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" />
                  {a}
                </li>
              ))}
            </ul>
          )}
          <p>{r.result}</p>
          {r.nextStep && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Suite : </span>
              {r.nextStep}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function TicketTimeline({ events, data, now }: { events: TicketEvent[]; data: WorkspaceData; now: Date }) {
  return (
    <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
      {events.map((e) => {
        if (e.report) return <ReportCard key={e.id} event={e} data={data} now={now} />;
        const Icon = e.automated ? Zap : ICON[e.kind];
        return (
          <li key={e.id} className="relative flex gap-3 pl-9 text-sm">
            <span
              className={cn(
                "absolute top-0.5 left-0 flex size-6 items-center justify-center rounded-full border bg-background",
                e.automated && "border-flow/30 text-flow",
              )}
            >
              <Icon className={cn("size-3", !e.automated && "text-subtle")} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{actorName(e, data)}</span> · {e.title}
                <time className="ml-2 text-xs text-subtle" title={new Date(e.at).toLocaleString("fr-FR")}>
                  {formatRelative(e.at, now)}
                </time>
              </p>
              {e.body && e.kind === "notification" ? (
                <details className="group mt-1">
                  <summary className="cursor-pointer text-xs text-subtle select-none hover:text-foreground">
                    Voir le message préparé (non envoyé)
                  </summary>
                  <pre className="mt-1.5 rounded-md border bg-surface p-2.5 font-sans text-xs whitespace-pre-wrap text-muted-foreground">
                    {e.body}
                  </pre>
                </details>
              ) : (
                e.body && <p className="mt-0.5 text-xs text-muted-foreground">{e.body}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
