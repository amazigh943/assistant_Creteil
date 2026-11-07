"use client";

import { Building2, Hand, MapPin, Phone, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PriorityIcon } from "@/components/tickets/priority-icon";
import { StatusLabel } from "@/components/tickets/status-icon";
import { ReasonChips, SlaChip, TicketRow } from "@/components/tickets/ticket-row";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Kbd } from "@/components/ui/kbd";
import { isSameDay } from "@/core/planning/slots";
import { SCHEDULE_KIND_LABEL } from "@/core/tickets/labels";
import { agentQueue, nextTicketFor, rankTickets, ticketContext } from "@/core/tickets/queries";
import { slaState } from "@/core/tickets/urgency";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { formatDay, formatRelative, formatShortDateTime, formatTime } from "@/lib/time";
import { cn, plural } from "@/lib/utils";
import { actions, useNow, useStore } from "@/store/workspace-store";

const KIND_STYLE: Record<string, string> = {
  callback: "bg-s-waiting",
  remote: "bg-s-scheduled",
  onsite: "bg-p-high",
  meeting: "bg-subtle",
  break: "bg-border-strong",
};

function Panel({ title, aside, children, className }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function TodayView() {
  const { data, currentAgentId } = useStore();
  const now = useNow();
  const router = useRouter();
  const me = data.agents.find((a) => a.id === currentAgentId)!;
  const team = data.teams.find((t) => t.id === me.teamId)!;

  const queue = useMemo(() => agentQueue(data, me.id, now), [data, me.id, now]);
  const nextTicket = nextTicketFor(data, me.id, now);
  const spotlight = queue.find((r) => r.ticket.id === nextTicket?.id);
  const rest = queue.filter((r) => r.ticket.id !== nextTicket?.id);
  const unassigned = useMemo(
    () => rankTickets(data, data.tickets.filter((t) => t.teamId === me.teamId && !t.assigneeId && t.status !== "resolved"), now),
    [data, me.teamId, now],
  );

  const agenda = data.schedule
    .filter((s) => s.agentId === me.id && isSameDay(new Date(s.start), now))
    .sort((a, b) => a.start.localeCompare(b.start));
  const reminders = data.reminders
    .filter((r) => r.agentId === me.id && (!r.done || isSameDay(new Date(r.dueAt), now)))
    .sort((a, b) => Number(a.done) - Number(b.done) || a.dueAt.localeCompare(b.dueAt));
  const myTicketIds = new Set(data.tickets.filter((t) => t.assigneeId === me.id).map((t) => t.id));
  const activity = data.events
    .filter((e) => e.automated && myTicketIds.has(e.ticketId) && now.getTime() - new Date(e.at).getTime() < 24 * 3600_000)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  const critical = queue.filter((r) => r.ticket.priority === "critical").length;
  const breached = queue.filter((r) => slaState(r.ticket, now) === "breached").length;
  const dueReminders = reminders.filter((r) => !r.done && new Date(r.dueAt) <= now).length;
  const resolvedToday = data.tickets.filter(
    (t) => t.assigneeId === me.id && t.resolvedAt && isSameDay(new Date(t.resolvedAt), now),
  ).length;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  useHotkeys({ enter: () => nextTicket && router.push(`/tickets/${nextTicket.reference}`) });

  const spot = spotlight ? ticketContext(data, spotlight.ticket) : null;

  return (
    <>
      <PageHeader>
        <span className="font-medium">Aujourd&apos;hui</span>
        <span className="text-subtle first-letter:uppercase">· {formatDay(now)}</span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-10">
          <div className="min-w-0 space-y-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">
                {greeting} {me.firstName}.
              </h1>
              <p className="mt-1.5 text-muted-foreground">
                <span className="text-foreground">{plural(queue.length, "ticket", "tickets")}</span> dans votre file
                {critical > 0 && (
                  <>
                    {" · "}
                    <span className="text-[oklch(0.52_0.18_25)]">{critical} critique{critical > 1 && "s"}</span>
                  </>
                )}
                {breached > 0 && <> · {breached} SLA dépassé{breached > 1 && "s"}</>}
                {dueReminders > 0 && <> · {dueReminders} rappel{dueReminders > 1 && "s"} à faire</>}
                {resolvedToday > 0 && <> · {resolvedToday} résolu{resolvedToday > 1 && "s"} aujourd&apos;hui</>}
              </p>
            </div>

            {spotlight && spot ? (
              <section className="overflow-hidden rounded-xl border bg-background shadow-xs">
                <div className="flex items-center gap-2 border-b bg-surface px-4 py-2 text-xs">
                  <span className="size-1.5 rounded-full bg-flow" />
                  <span className="font-medium">À traiter maintenant</span>
                  <span className="text-subtle">· le plus urgent de votre file</span>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <PriorityIcon priority={spotlight.ticket.priority} className="size-3.5" />
                    <span className="font-mono">{spotlight.ticket.reference}</span>
                    <StatusLabel status={spotlight.ticket.status} />
                    <SlaChip ticket={spotlight.ticket} now={now} always />
                    <ReasonChips reasons={spotlight.urgency.reasons} />
                  </div>
                  <div>
                    <h2 className="text-lg leading-snug font-semibold tracking-[-0.01em]">{spotlight.ticket.title}</h2>
                    <p className="mt-1.5 line-clamp-2 text-muted-foreground">{spotlight.ticket.description}</p>
                  </div>
                  {spot.requester && (
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                      <span className="font-medium">
                        {spot.requester.firstName} {spot.requester.lastName}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="size-3.5 text-subtle" />
                        {spot.company?.name}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="size-3.5 text-subtle" />
                        {spot.site?.name}, {spot.site?.city}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground tabular">
                        <Phone className="size-3.5 text-subtle" />
                        {spot.requester.phone}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      variant="flow"
                      onClick={() => {
                        actions.startCall(spotlight.ticket.id);
                        router.push(`/tickets/${spotlight.ticket.reference}`);
                      }}
                    >
                      <Phone /> Ouvrir et appeler
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/tickets/${spotlight.ticket.reference}`}>
                        Ouvrir le ticket <Kbd>↵</Kbd>
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">Rien d&apos;urgent pour l&apos;instant</p>
                <p className="mt-1 text-muted-foreground">
                  Les tickets en attente de réponse ou planifiés reviendront automatiquement au bon moment.
                </p>
              </section>
            )}

            <Panel
              title="Ensuite dans votre file"
              aside={
                <Link href="/tickets" className="text-xs text-subtle hover:text-foreground">
                  Tout voir
                </Link>
              }
            >
              <div className="divide-y divide-border/70 overflow-hidden rounded-lg border">
                {rest.length === 0 && <p className="px-4 py-3 text-muted-foreground">Aucun autre ticket.</p>}
                {rest.map(({ ticket, urgency }) => (
                  <TicketRow key={ticket.id} ticket={ticket} data={data} now={now} reasons={urgency.reasons} showAssignee={false} className="px-4" />
                ))}
              </div>
            </Panel>

            {unassigned.length > 0 && (
              <Panel title={`À prendre dans la file ${team.name}`}>
                <div className="divide-y divide-border/70 overflow-hidden rounded-lg border">
                  {unassigned.map(({ ticket, urgency }) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      data={data}
                      now={now}
                      reasons={urgency.reasons}
                      showAssignee={false}
                      className="px-4"
                      trailing={
                        <Button size="sm" variant="outline" onClick={() => actions.startWork(ticket.id)}>
                          <Hand /> Prendre
                        </Button>
                      }
                    />
                  ))}
                </div>
              </Panel>
            )}
          </div>

          <aside className="space-y-8">
            <Panel
              title="Planning du jour"
              aside={
                <Link href="/planning" className="text-xs text-subtle hover:text-foreground">
                  Équipe
                </Link>
              }
            >
              <ol className="relative space-y-1">
                {agenda.length === 0 && <li className="px-1 text-muted-foreground">Aucun créneau aujourd&apos;hui.</li>}
                {agenda.map((item, i) => {
                  const start = new Date(item.start);
                  const end = new Date(item.end);
                  const past = end < now;
                  const current = start <= now && now < end;
                  const showNow = !current && start > now && (i === 0 || new Date(agenda[i - 1].end) <= now);
                  const ticket = item.ticketId ? data.tickets.find((t) => t.id === item.ticketId) : undefined;
                  const content = (
                    <>
                      <span className={cn("w-11 shrink-0 pt-px text-xs tabular", past ? "text-subtle" : "text-muted-foreground")}>
                        {formatTime(start)}
                      </span>
                      <span className={cn("mt-1 h-8 w-0.5 shrink-0 rounded-full", KIND_STYLE[item.kind], past && "opacity-40")} />
                      <span className="min-w-0">
                        <span className={cn("block truncate text-sm", past && "text-muted-foreground")}>{item.title}</span>
                        <span className="block truncate text-xs text-subtle">
                          {SCHEDULE_KIND_LABEL[item.kind]} · {formatTime(start)}–{formatTime(end)}
                          {item.createdBy === "automation" && " · ajouté par FlowPilot"}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {showNow && <NowLine now={now} />}
                      {ticket ? (
                        <Link
                          href={`/tickets/${ticket.reference}`}
                          className={cn("flex gap-2.5 rounded-md px-1 py-1.5 transition-colors hover:bg-surface", current && "bg-flow-soft")}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className={cn("flex gap-2.5 rounded-md px-1 py-1.5", current && "bg-flow-soft")}>{content}</div>
                      )}
                    </li>
                  );
                })}
                {agenda.length > 0 && new Date(agenda[agenda.length - 1].end) <= now && <NowLine now={now} />}
              </ol>
            </Panel>

            <Panel title="Rappels">
              <ul className="space-y-0.5">
                {reminders.length === 0 && <li className="px-1 text-muted-foreground">Aucun rappel.</li>}
                {reminders.map((r) => {
                  const due = new Date(r.dueAt);
                  const overdue = !r.done && due < new Date(now.getTime() - 5 * 60_000);
                  const ticket = data.tickets.find((t) => t.id === r.ticketId);
                  return (
                    <li key={r.id} className="group flex items-start gap-2.5 rounded-md px-1 py-1.5 hover:bg-surface">
                      <Checkbox
                        checked={r.done}
                        onCheckedChange={(v) => actions.setReminderDone(r.id, v === true)}
                        className="mt-0.5"
                        aria-label={`Marquer « ${r.title} » comme fait`}
                      />
                      <Link
                        href={ticket ? `/tickets/${ticket.reference}` : "#"}
                        className={cn("min-w-0 flex-1", r.done && "text-muted-foreground line-through decoration-border-strong")}
                      >
                        <span className="block text-sm leading-5">{r.title}</span>
                        <span
                          className={cn(
                            "block text-xs tabular",
                            overdue ? "text-[oklch(0.52_0.18_25)]" : "text-subtle",
                          )}
                        >
                          {overdue ? `En retard · ${formatShortDateTime(due, now)}` : formatShortDateTime(due, now)}
                          {r.createdBy === "automation" && " · automatique"}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel title="Fait pour vous par FlowPilot">
              <ul className="space-y-2.5 px-1">
                {activity.length === 0 && <li className="text-muted-foreground">Rien pour l&apos;instant.</li>}
                {activity.map((e) => {
                  const ticket = data.tickets.find((t) => t.id === e.ticketId)!;
                  return (
                    <li key={e.id} className="flex gap-2 text-xs">
                      <Zap className="mt-0.5 size-3 shrink-0 text-flow" />
                      <Link href={`/tickets/${ticket.reference}`} className="min-w-0 hover:text-foreground">
                        <span className="text-foreground">{e.title}</span>
                        <span className="block text-subtle">
                          <span className="font-mono">{ticket.reference}</span> · {formatRelative(e.at, now)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </aside>
        </div>
      </div>
    </>
  );
}

function NowLine({ now }: { now: Date }) {
  return (
    <div className="my-1 flex items-center gap-2 px-1" aria-label="Maintenant">
      <span className="w-11 text-[11px] font-medium text-flow-strong tabular">{formatTime(now)}</span>
      <span className="relative h-px flex-1 bg-flow">
        <span className="absolute -top-[3px] -left-1 size-[7px] rounded-full bg-flow" />
      </span>
    </div>
  );
}

