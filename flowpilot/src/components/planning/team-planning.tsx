"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AgentAvatar, presenceLabel, TeamDot } from "@/components/common/agent-avatar";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ScheduleItem, ScheduleKind } from "@/core/domain/types";
import { isSameDay } from "@/core/planning/slots";
import { SCHEDULE_KIND_LABEL } from "@/core/tickets/labels";
import { openTicketCountByAgent } from "@/core/tickets/queries";
import { formatDay, formatTime } from "@/lib/time";
import { cn, fullName, plural } from "@/lib/utils";
import { useNow, useStore } from "@/store/workspace-store";

const START_HOUR = 8;
const END_HOUR = 18;
const SPAN_MIN = (END_HOUR - START_HOUR) * 60;

const KIND: Record<ScheduleKind, { block: string; bar: string }> = {
  callback: { block: "bg-[color-mix(in_oklch,var(--s-waiting)_12%,white)] text-[oklch(0.38_0.1_300)]", bar: "bg-s-waiting" },
  remote: { block: "bg-[color-mix(in_oklch,var(--s-scheduled)_11%,white)] text-[oklch(0.38_0.11_250)]", bar: "bg-s-scheduled" },
  onsite: { block: "bg-[color-mix(in_oklch,var(--p-high)_13%,white)] text-[oklch(0.42_0.11_50)]", bar: "bg-p-high" },
  meeting: { block: "bg-surface-strong text-muted-foreground", bar: "bg-subtle" },
  break: {
    block:
      "bg-[repeating-linear-gradient(135deg,var(--surface)_0_6px,var(--surface-strong)_6px_12px)] text-subtle",
    bar: "bg-border-strong",
  },
};

function minutesFromStart(d: Date) {
  return (d.getHours() - START_HOUR) * 60 + d.getMinutes();
}

function Block({ item, ticketRef }: { item: ScheduleItem; ticketRef?: string }) {
  const start = new Date(item.start);
  const end = new Date(item.end);
  const left = Math.max(0, minutesFromStart(start));
  const right = Math.min(SPAN_MIN, minutesFromStart(end));
  if (right <= 0 || left >= SPAN_MIN) return null;
  const style = { left: `${(left / SPAN_MIN) * 100}%`, width: `${((right - left) / SPAN_MIN) * 100}%` };
  const k = KIND[item.kind];
  const className = cn(
    "absolute inset-y-1.5 flex items-center overflow-hidden rounded-[5px] pr-1.5 text-[11px] leading-tight outline-none focus-visible:ring-2 focus-visible:ring-ring",
    k.block,
    item.createdBy === "automation" && "ring-1 ring-flow ring-offset-1 ring-offset-background",
  );
  const inner = (
    <>
      <span className={cn("mr-1.5 h-full w-[3px] shrink-0", k.bar)} />
      <span className="truncate font-medium">{item.title}</span>
    </>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {ticketRef ? (
          <Link href={`/tickets/${ticketRef}`} className={cn(className, "hover:brightness-[0.97]")} style={style}>
            {inner}
          </Link>
        ) : (
          <span tabIndex={0} className={className} style={style}>
            {inner}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <span className="block font-medium">{item.title}</span>
        <span className="block opacity-80">
          {SCHEDULE_KIND_LABEL[item.kind]} · {formatTime(start)}–{formatTime(end)}
        </span>
        {item.location && <span className="block opacity-80">{item.location}</span>}
        {item.createdBy === "automation" && <span className="block opacity-80">Ajouté automatiquement par FlowPilot</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export function TeamPlanning() {
  const { data, currentAgentId } = useStore();
  const now = useNow(30_000);
  const [offset, setOffset] = useState(0);
  const day = new Date(now);
  day.setDate(now.getDate() + offset);
  const isToday = offset === 0;
  const counts = openTicketCountByAgent(data);
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const nowPct = (minutesFromStart(now) / SPAN_MIN) * 100;

  const items = data.schedule.filter((s) => isSameDay(new Date(s.start), day));
  const automated = items.filter((s) => s.createdBy === "automation").length;

  return (
    <>
      <PageHeader
        actions={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setOffset((o) => o - 1)} aria-label="Jour précédent">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOffset(0)} disabled={isToday}>
              Aujourd&apos;hui
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setOffset((o) => o + 1)} aria-label="Jour suivant">
              <ChevronRight />
            </Button>
          </div>
        }
      >
        <span className="font-medium">Planning</span>
        <span className="text-subtle first-letter:uppercase">· {formatDay(day)}</span>
        {automated > 0 && (
          <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-sm ring-1 ring-flow ring-offset-1" />
            {automated} créneau{automated > 1 ? "x" : ""} ajouté{automated > 1 ? "s" : ""} par FlowPilot
          </span>
        )}
      </PageHeader>

      <div className="flex-1 overflow-auto scrollbar-thin">
        <div className="min-w-[900px]">
          {/* Échelle horaire */}
          <div className="sticky top-0 z-20 grid grid-cols-[240px_1fr] border-b bg-background/95 backdrop-blur">
            <div className="px-6 py-2 text-xs text-subtle">{data.agents.length} agents</div>
            <div className="relative mr-6 h-8">
              {hours.map((h) => (
                <span
                  key={h}
                  className="absolute top-2 -translate-x-1/2 text-[11px] text-subtle tabular"
                  style={{ left: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
          </div>

          {data.teams.map((team) => (
            <section key={team.id}>
              <div className="flex items-center gap-2 border-b bg-surface px-6 py-1.5 text-xs">
                <TeamDot color={team.color} />
                <span className="font-medium">{team.name}</span>
                <span className="text-subtle">{team.description}</span>
              </div>
              {data.agents
                .filter((a) => a.teamId === team.id)
                .map((agent) => {
                  const mine = items.filter((s) => s.agentId === agent.id);
                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        "grid grid-cols-[240px_1fr] border-b border-border/70",
                        agent.id === currentAgentId && "bg-flow-soft/40",
                      )}
                    >
                      <div className="flex items-center gap-2.5 px-6 py-2">
                        <AgentAvatar agent={agent} teamColor={team.color} size="sm" showPresence />
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-sm font-medium">
                            {fullName(agent)}
                            {agent.id === currentAgentId && <span className="ml-1 font-normal text-subtle">(vous)</span>}
                          </div>
                          <div className="truncate text-[11px] text-subtle">
                            {presenceLabel(agent.presence)} · {plural(counts.get(agent.id) ?? 0, "ticket ouvert", "tickets ouverts")}
                          </div>
                        </div>
                      </div>
                      <div className="relative mr-6 h-12">
                        {hours.map((h) => (
                          <span
                            key={h}
                            className="absolute inset-y-0 w-px bg-border/60"
                            style={{ left: `${((h - START_HOUR) / (END_HOUR - START_HOUR)) * 100}%` }}
                          />
                        ))}
                        {mine.map((item) => (
                          <Block
                            key={item.id}
                            item={item}
                            ticketRef={data.tickets.find((t) => t.id === item.ticketId)?.reference}
                          />
                        ))}
                        {isToday && nowPct >= 0 && nowPct <= 100 && (
                          <span className="absolute inset-y-0 z-10 w-px bg-flow" style={{ left: `${nowPct}%` }} />
                        )}
                      </div>
                    </div>
                  );
                })}
            </section>
          ))}

          <div className="flex flex-wrap gap-4 px-6 py-4 text-xs text-muted-foreground">
            {(Object.keys(KIND) as ScheduleKind[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn("h-3 w-1 rounded-full", KIND[k].bar)} />
                {SCHEDULE_KIND_LABEL[k]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
