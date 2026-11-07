"use client";

import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { emptyDraft, suggestSlots, type InterventionDraft } from "@/components/intervention/draft";
import { InterventionPanel } from "@/components/intervention/intervention-panel";
import { PageHeader } from "@/components/shell/page-header";
import { PriorityIcon } from "@/components/tickets/priority-icon";
import { StatusLabel } from "@/components/tickets/status-icon";
import { SlaChip } from "@/components/tickets/ticket-row";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { Ticket } from "@/core/domain/types";
import { CATEGORY_LABEL, CHANNEL_LABEL, PRIORITY_LABEL } from "@/core/tickets/labels";
import { agentQueue, eventsOf, findTicketByReference, ticketContext } from "@/core/tickets/queries";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { formatRelative } from "@/lib/time";
import { actions, useNow, useStore } from "@/store/workspace-store";
import { RequesterCard } from "./requester-card";
import { TicketProperties } from "./ticket-properties";
import { TicketTimeline } from "./ticket-timeline";

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Workspace({ ticket }: { ticket: Ticket }) {
  const { data, currentAgentId, activeCall } = useStore();
  const now = useNow();
  const router = useRouter();
  const ctx = ticketContext(data, ticket);
  const events = eventsOf(data, ticket.id);

  // Navigation dans la file de l'agent (J / K).
  const queue = useMemo(() => agentQueue(data, currentAgentId, now).map((r) => r.ticket), [data, currentAgentId, now]);
  const index = queue.findIndex((t) => t.id === ticket.id);
  const prev = index > 0 ? queue[index - 1] : undefined;
  const next = index >= 0 && index < queue.length - 1 ? queue[index + 1] : undefined;

  // Les créneaux proposés sont calculés depuis l'heure d'ouverture du ticket.
  const [openedAt] = useState(now);
  const [draft, setDraftState] = useState<InterventionDraft>(() =>
    emptyDraft(suggestSlots(data.schedule, currentAgentId, ticket.id, openedAt, 15)[0].start),
  );
  const setDraft = (updater: (d: InterventionDraft) => InterventionDraft) =>
    setDraftState((d) => {
      const nextDraft = updater(d);
      // Durée modifiée : on repropose le premier créneau libre compatible.
      if (nextDraft.followUp.durationMin !== d.followUp.durationMin) {
        const [first] = suggestSlots(data.schedule, currentAgentId, ticket.id, openedAt, nextDraft.followUp.durationMin);
        return { ...nextDraft, followUp: { ...nextDraft.followUp, start: first.start.toISOString() } };
      }
      return nextDraft;
    });
  const slotDuration = draft.followUp.durationMin;
  const slots = useMemo(
    () => suggestSlots(data.schedule, currentAgentId, ticket.id, openedAt, slotDuration),
    [data.schedule, currentAgentId, ticket.id, openedAt, slotDuration],
  );

  const toggleCall = () => {
    if (ticket.status === "resolved") return;
    if (activeCall?.ticketId === ticket.id) actions.endCall();
    else if (!activeCall) actions.startCall(ticket.id);
  };

  useHotkeys({
    c: toggleCall,
    j: () => next && router.push(`/tickets/${next.reference}`),
    k: () => prev && router.push(`/tickets/${prev.reference}`),
  });

  return (
    <>
      <PageHeader
        actions={
          index >= 0 && (
            <div className="flex items-center gap-1 text-xs text-subtle">
              <span className="tabular mr-1">
                {index + 1} / {queue.length}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!prev}
                onClick={() => prev && router.push(`/tickets/${prev.reference}`)}
                aria-label="Ticket précédent (K)"
                title="Ticket précédent (K)"
              >
                <ChevronUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!next}
                onClick={() => next && router.push(`/tickets/${next.reference}`)}
                aria-label="Ticket suivant (J)"
                title="Ticket suivant (J)"
              >
                <ChevronDown />
              </Button>
            </div>
          )
        }
      >
        <Link href="/tickets" className="text-muted-foreground hover:text-foreground">
          Tickets
        </Link>
        <ChevronRight className="size-3.5 text-subtle" />
        <span className="font-mono text-xs">{ticket.reference}</span>
      </PageHeader>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-3xl space-y-7 px-6 py-7 lg:px-10">
            <header className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                <span className="font-mono">{ticket.reference}</span>
                <StatusLabel status={ticket.status} className="text-foreground" />
                <span className="inline-flex items-center gap-1">
                  <PriorityIcon priority={ticket.priority} className="size-3.5" />
                  {PRIORITY_LABEL[ticket.priority]}
                </span>
                <span>{CATEGORY_LABEL[ticket.category]}</span>
                <SlaChip ticket={ticket} now={now} always />
              </div>
              <h1 className="text-xl leading-tight font-semibold tracking-[-0.015em] text-balance">{ticket.title}</h1>
              <p className="text-xs text-subtle">
                Ouvert {formatRelative(ticket.createdAt, now)} · {CHANNEL_LABEL[ticket.channel]}
              </p>
            </header>

            <RequesterCard ctx={ctx} />

            <Section title="Description">
              <p className="leading-relaxed whitespace-pre-line text-foreground/90">{ticket.description}</p>
            </Section>

            <InterventionPanel
              key={ticket.id}
              ticket={ticket}
              draft={draft}
              setDraft={setDraft}
              slots={slots}
              now={now}
            />

            <Section
              title="Historique"
              aside={<span className="text-xs text-subtle tabular">{events.length} événements</span>}
            >
              <TicketTimeline events={events} data={data} now={now} />
            </Section>

            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-4 text-[11px] text-subtle">
              <span><Kbd>C</Kbd> appeler / raccrocher</span>
              <span><Kbd>1</Kbd>–<Kbd>4</Kbd> issue</span>
              <span><Kbd>⌘↵</Kbd> valider</span>
              <span><Kbd>J</Kbd> <Kbd>K</Kbd> naviguer</span>
            </p>
          </div>
        </div>

        <aside className="hidden w-[340px] shrink-0 space-y-7 overflow-y-auto border-l bg-surface px-5 py-6 scrollbar-thin lg:block">
          <TicketProperties ctx={ctx} now={now} />
          <div className="border-t" />
          <AssistantPanel
            ticket={ticket}
            data={data}
            selectedActions={draft.quickActionIds}
            onToggleAction={(id) =>
              setDraft((d) => ({
                ...d,
                quickActionIds: d.quickActionIds.includes(id)
                  ? d.quickActionIds.filter((x) => x !== id)
                  : [...d.quickActionIds, id],
              }))
            }
            onSuggestTransfer={(teamId) =>
              setDraft((d) => ({ ...d, outcome: "transfer", transfer: { ...d.transfer, teamId } }))
            }
          />
        </aside>
      </div>
    </>
  );
}

export function TicketWorkspace({ reference }: { reference: string }) {
  const { data } = useStore();
  const ticket = findTicketByReference(data, decodeURIComponent(reference));
  if (!ticket) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="font-medium">Ticket introuvable</p>
        <p className="text-muted-foreground">La référence « {reference} » n&apos;existe pas dans cette organisation.</p>
        <Button variant="outline" asChild className="mt-2">
          <Link href="/tickets">Retour aux tickets</Link>
        </Button>
      </div>
    );
  }
  return <Workspace key={ticket.id} ticket={ticket} />;
}
