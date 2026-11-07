import type {
  FollowUpMode,
  Id,
  InterventionInput,
  InterventionOutcome,
  ScheduleItem,
} from "@/core/domain/types";
import { findNextFreeSlot, WORKDAY } from "@/core/planning/slots";

/** État de saisie d'une intervention, avant génération du compte rendu. */
export interface InterventionDraft {
  outcome: InterventionOutcome | null;
  quickActionIds: string[];
  note: string;
  followUp: { mode: FollowUpMode; start: string; durationMin: number };
  transfer: { teamId: Id | null; reasonIds: string[] };
}

export const DEFAULT_DURATION: Record<FollowUpMode, number> = {
  callback: 15,
  remote: 30,
  onsite: 60,
};

export interface SlotOption {
  id: string;
  label: string;
  start: Date;
}

/** Créneaux proposés pour la suite : prochain libre, demain matin, demain après-midi. */
export function suggestSlots(
  schedule: ScheduleItem[],
  agentId: Id,
  ticketId: Id,
  now: Date,
  durationMin: number,
): SlotOption[] {
  const items = schedule.filter((s) => s.ticketId !== ticketId);
  const next = findNextFreeSlot(items, agentId, new Date(now.getTime() + 30 * 60_000), durationMin);
  const tomorrowAm = new Date(now);
  tomorrowAm.setDate(now.getDate() + 1);
  tomorrowAm.setHours(9, 0, 0, 0);
  const tomorrowPm = new Date(tomorrowAm);
  tomorrowPm.setHours(14, 0, 0, 0);
  const am = findNextFreeSlot(items, agentId, tomorrowAm, durationMin);
  const pm = findNextFreeSlot(items, agentId, tomorrowPm, durationMin);
  const options: SlotOption[] = [{ id: "next", label: "Prochain créneau libre", start: next.start }];
  if (am.start.getTime() !== next.start.getTime())
    options.push({ id: "am", label: "Demain matin", start: am.start });
  if (pm.start.getTime() !== next.start.getTime() && pm.start.getHours() < WORKDAY.endHour)
    options.push({ id: "pm", label: "Demain après-midi", start: pm.start });
  return options;
}

export function emptyDraft(defaultSlot: Date): InterventionDraft {
  return {
    outcome: null,
    quickActionIds: [],
    note: "",
    followUp: { mode: "callback", start: defaultSlot.toISOString(), durationMin: DEFAULT_DURATION.callback },
    transfer: { teamId: null, reasonIds: [] },
  };
}

export function toInput(
  draft: InterventionDraft,
  ticketId: Id,
  agentId: Id,
  callDurationSec: number,
): InterventionInput | null {
  if (!draft.outcome) return null;
  return {
    ticketId,
    agentId,
    outcome: draft.outcome,
    quickActionIds: draft.quickActionIds,
    note: draft.note,
    callDurationSec,
    followUp: draft.outcome === "follow_up" ? draft.followUp : undefined,
    transfer:
      draft.outcome === "transfer" && draft.transfer.teamId
        ? { teamId: draft.transfer.teamId, reasonIds: draft.transfer.reasonIds }
        : undefined,
  };
}
