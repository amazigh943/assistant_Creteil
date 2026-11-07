"use client";

import {
  CalendarRange,
  ChevronsUpDown,
  Inbox,
  PhoneCall,
  RotateCcw,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { AgentAvatar, presenceLabel, TeamDot } from "@/components/common/agent-avatar";
import { LogoMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isOpen } from "@/core/tickets/urgency";
import { formatDuration } from "@/lib/time";
import { cn, fullName } from "@/lib/utils";
import { actions, useCallElapsed, useNow, useStore } from "@/store/workspace-store";

function NavItem({
  href,
  icon: Icon,
  label,
  count,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-7 items-center gap-2 rounded-md px-2 text-sm transition-colors",
        active
          ? "bg-background font-medium text-foreground shadow-[0_0_0_1px_var(--border)]"
          : "text-muted-foreground hover:bg-surface-strong hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4", active ? "text-foreground" : "text-subtle group-hover:text-muted-foreground")} />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="tabular text-xs text-subtle">{count}</span>
      )}
    </Link>
  );
}

function ActiveCallPill() {
  const { data } = useStore();
  const call = useCallElapsed();
  if (!call) return null;
  const ticket = data.tickets.find((t) => t.id === call.ticketId);
  if (!ticket) return null;
  return (
    <Link
      href={`/tickets/${ticket.reference}`}
      className="mx-3 mb-2 flex items-center gap-2 rounded-md border border-[color-mix(in_oklch,var(--s-progress)_40%,transparent)] bg-[color-mix(in_oklch,var(--s-progress)_10%,transparent)] px-2.5 py-1.5 text-xs"
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-s-progress opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-s-progress" />
      </span>
      <PhoneCall className="size-3.5 text-foreground/70" />
      <span className="font-medium">{ticket.reference}</span>
      <span className="ml-auto tabular text-muted-foreground">{formatDuration(call.seconds)}</span>
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data, currentAgentId, clockOffsetMs } = useStore();
  const now = useNow(30_000);
  const me = data.agents.find((a) => a.id === currentAgentId)!;
  const myTeam = data.teams.find((t) => t.id === me.teamId)!;
  const myOpen = data.tickets.filter((t) => t.assigneeId === me.id && isOpen(t)).length;
  const dueReminders = data.reminders.filter(
    (r) => r.agentId === me.id && !r.done && new Date(r.dueAt) <= now,
  ).length;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-surface md:flex">
      <div className="flex h-12 items-center gap-2 px-4">
        <LogoMark />
        <div className="min-w-0 leading-tight">
          <div className="text-[13px] font-semibold tracking-[-0.01em]">FlowPilot</div>
          <div className="truncate text-[11px] text-muted-foreground">{data.organization.name}</div>
        </div>
        <Badge variant="muted" className="ml-auto text-[10px]">
          Démo
        </Badge>
      </div>

      <nav className="space-y-0.5 px-2 pt-3">
        <NavItem href="/" icon={Sun} label="Aujourd'hui" active={pathname === "/"} count={dueReminders} />
        <NavItem
          href="/tickets"
          icon={Inbox}
          label="Mes tickets"
          count={myOpen}
          active={pathname.startsWith("/tickets")}
        />
        <NavItem href="/planning" icon={CalendarRange} label="Planning" active={pathname === "/planning"} />
      </nav>

      <div className="px-4 pt-6 pb-1.5 text-[11px] font-medium text-subtle">Files d&apos;équipe</div>
      <nav className="space-y-0.5 px-2">
        {data.teams.map((team) => {
          const count = data.tickets.filter((t) => t.teamId === team.id && isOpen(t)).length;
          return (
            <Link
              key={team.id}
              href={`/tickets?vue=equipe&equipe=${team.id}`}
              className="flex h-7 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground"
            >
              <TeamDot color={team.color} className="ml-1" />
              <span className="flex-1 truncate">{team.name}</span>
              <span className="tabular text-xs text-subtle">{count}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <ActiveCallPill />
        {clockOffsetMs !== 0 && (
          <p className="mx-4 mb-2 text-[11px] leading-snug text-subtle">
            Horloge de démonstration : la journée démarre à 10:40 pour garder un planning cohérent.
          </p>
        )}
        <div className="border-t p-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left outline-none hover:bg-surface-strong focus-visible:ring-[3px] focus-visible:ring-ring">
              <AgentAvatar agent={me} teamColor={myTeam.color} size="md" showPresence />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium">{fullName(me)}</span>
                <span className="block truncate text-xs text-muted-foreground">{myTeam.name}</span>
              </span>
              <ChevronsUpDown className="size-3.5 text-subtle" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-64">
              <DropdownMenuLabel>Voir FlowPilot en tant que</DropdownMenuLabel>
              <div className="max-h-72 overflow-y-auto scrollbar-thin">
                {data.teams.map((team) => (
                  <DropdownMenuGroup key={team.id}>
                    <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[11px] text-subtle">
                      <TeamDot color={team.color} /> {team.name}
                    </div>
                    {data.agents
                      .filter((a) => a.teamId === team.id)
                      .map((a) => (
                        <DropdownMenuItem
                          key={a.id}
                          onSelect={() => actions.switchAgent(a.id)}
                          className={cn(a.id === me.id && "bg-accent")}
                        >
                          <AgentAvatar agent={a} teamColor={team.color} size="xs" showPresence />
                          <span className="flex-1 truncate">{fullName(a)}</span>
                          <span className="text-[11px] text-subtle">{presenceLabel(a.presence)}</span>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuGroup>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  actions.resetDemo();
                  toast("Démo réinitialisée", { description: "Les données fictives ont été régénérées." });
                }}
              >
                <RotateCcw /> Réinitialiser la démo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}
