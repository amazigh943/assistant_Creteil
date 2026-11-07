"use client";

import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { TeamDot } from "@/components/common/agent-avatar";
import { PageHeader } from "@/components/shell/page-header";
import { Input } from "@/components/ui/input";
import type { Ticket, TicketStatus } from "@/core/domain/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/core/tickets/labels";
import { rankTickets, ticketContext } from "@/core/tickets/queries";
import { normalize } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useNow, useStore } from "@/store/workspace-store";
import { StatusIcon } from "./status-icon";
import { TicketRow } from "./ticket-row";

type View = "moi" | "equipe" | "tous";

const VIEWS: { id: View; label: string }[] = [
  { id: "moi", label: "Mes tickets" },
  { id: "equipe", label: "Équipe" },
  { id: "tous", label: "Tous" },
];

export function TicketsView() {
  const { data, currentAgentId } = useStore();
  const now = useNow();
  const params = useSearchParams();
  const router = useRouter();
  const me = data.agents.find((a) => a.id === currentAgentId)!;

  const view = (params.get("vue") as View) || "moi";
  const teamId = params.get("equipe") ?? me.teamId;
  const team = data.teams.find((t) => t.id === teamId);
  const [query, setQuery] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const tickets = useMemo(() => {
    let list: Ticket[] = data.tickets;
    if (view === "moi") list = list.filter((t) => t.assigneeId === currentAgentId);
    if (view === "equipe") list = list.filter((t) => t.teamId === teamId);
    const q = normalize(query.trim());
    if (q) {
      list = list.filter((t) => {
        const { requester, company } = ticketContext(data, t);
        return normalize(
          `${t.reference} ${t.title} ${requester?.firstName} ${requester?.lastName} ${company?.name}`,
        ).includes(q);
      });
    }
    return list;
  }, [data, view, teamId, currentAgentId, query]);

  const groups = useMemo(() => {
    const ranked = rankTickets(data, tickets, now);
    return STATUS_ORDER.map((status) => ({
      status,
      items: ranked.filter((r) => r.ticket.status === status),
    })).filter((g) => g.items.length > 0);
  }, [data, tickets, now]);

  const setView = (v: View, team?: string) => {
    const sp = new URLSearchParams();
    if (v !== "moi") sp.set("vue", v);
    if (v === "equipe") sp.set("equipe", team ?? teamId);
    router.replace(`/tickets${sp.size ? `?${sp}` : ""}`);
  };

  const openCount = tickets.filter((t) => t.status !== "resolved").length;

  return (
    <>
      <PageHeader
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-subtle" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un ticket, un utilisateur…"
              className="h-7 w-64 pl-8 text-xs"
            />
          </div>
        }
      >
        <span className="font-medium">Tickets</span>
        <ChevronRight className="size-3.5 text-subtle" />
        <div className="flex items-center gap-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors",
                view === v.id
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.id === "equipe" && team && <TeamDot color={team.color} />}
              {v.id === "equipe" && team ? team.name : v.label}
            </button>
          ))}
        </div>
        {view === "equipe" && (
          <select
            aria-label="Équipe"
            value={teamId}
            onChange={(e) => setView("equipe", e.target.value)}
            className="ml-1 h-7 rounded-md border border-input bg-background px-1.5 text-xs text-muted-foreground"
          >
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
        <span className="ml-2 text-xs text-subtle tabular">{openCount} ouverts</span>
      </PageHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {groups.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center gap-1 text-center">
            <p className="font-medium">Aucun ticket</p>
            <p className="text-muted-foreground">
              {query ? "Aucun résultat pour cette recherche." : "Cette file est vide. Beau travail."}
            </p>
          </div>
        )}
        {groups.map(({ status, items }) => {
          const collapsed = status === "resolved" && !showResolved;
          return (
            <section key={status}>
              <button
                onClick={() => status === "resolved" && setShowResolved((v) => !v)}
                className={cn(
                  "sticky top-0 z-10 flex h-9 w-full items-center gap-2 border-b bg-surface/95 px-6 text-left text-xs backdrop-blur",
                  status === "resolved" ? "cursor-pointer" : "cursor-default",
                )}
              >
                <StatusIcon status={status as TicketStatus} />
                <span className="font-medium text-foreground">{STATUS_LABEL[status]}</span>
                <span className="text-subtle tabular">{items.length}</span>
                {status === "resolved" && (
                  <span className="ml-auto text-subtle">{collapsed ? "Afficher" : "Masquer"}</span>
                )}
              </button>
              {!collapsed && (
                <div className="divide-y divide-border/70">
                  {items.map(({ ticket, urgency }) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      data={data}
                      now={now}
                      reasons={urgency.reasons}
                      showAssignee={view !== "moi"}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
        {view === "moi" && (
          <p className="px-6 py-6 text-xs text-subtle">
            Les tickets sont triés par urgence : priorité, proximité du SLA, demandeur VIP et tentatives d&apos;appel.{" "}
            <Link href="/tickets?vue=tous" className="underline underline-offset-2 hover:text-foreground">
              Voir tous les tickets
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
