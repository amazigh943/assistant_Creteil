import type { Agent, AgentPresence, TeamColor } from "@/core/domain/types";
import { cn, initials } from "@/lib/utils";

const TEAM_BG: Record<TeamColor, string> = {
  teal: "bg-team-teal",
  blue: "bg-team-blue",
  amber: "bg-team-amber",
  rose: "bg-team-rose",
};

const PRESENCE: Record<AgentPresence, { color: string; label: string }> = {
  available: { color: "bg-flow", label: "Disponible" },
  on_call: { color: "bg-s-progress", label: "En appel" },
  away: { color: "bg-subtle", label: "Absent" },
  offline: { color: "bg-border-strong", label: "Hors ligne" },
};

export const presenceLabel = (p: AgentPresence) => PRESENCE[p].label;

export function AgentAvatar({
  agent,
  teamColor,
  size = "sm",
  showPresence = false,
  className,
}: {
  agent: Pick<Agent, "firstName" | "lastName" | "presence">;
  teamColor?: TeamColor;
  size?: "xs" | "sm" | "md";
  showPresence?: boolean;
  className?: string;
}) {
  const dims = { xs: "size-5 text-[9px]", sm: "size-6 text-[10px]", md: "size-8 text-xs" }[size];
  return (
    <span className={cn("relative inline-flex shrink-0", className)} title={`${agent.firstName} ${agent.lastName}`}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold text-white",
          dims,
          teamColor ? TEAM_BG[teamColor] : "bg-subtle",
        )}
      >
        {initials(agent)}
      </span>
      {showPresence && (
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-background",
            PRESENCE[agent.presence].color,
          )}
        />
      )}
    </span>
  );
}

export function TeamDot({ color, className }: { color: TeamColor; className?: string }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", TEAM_BG[color], className)} />;
}
