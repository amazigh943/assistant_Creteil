import type { Id, ScheduleItem } from "../domain/types";

/**
 * Heures ouvrées du prototype (heure locale de l'exécution).
 * Une version multi-organisation lira ces valeurs depuis la configuration
 * de l'organisation et son fuseau horaire.
 */
export const WORKDAY = { startHour: 8, startMinute: 30, endHour: 18, endMinute: 0 } as const;
export const SLOT_MINUTES = 15;

const MINUTE = 60_000;

export function roundUpToSlot(date: Date, slotMinutes = SLOT_MINUTES): Date {
  const ms = slotMinutes * MINUTE;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

function dayStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(WORKDAY.startHour, WORKDAY.startMinute, 0, 0);
  return d;
}

function dayEnd(date: Date): Date {
  const d = new Date(date);
  d.setHours(WORKDAY.endHour, WORKDAY.endMinute, 0, 0);
  return d;
}

function nextDayStart(date: Date): Date {
  const d = dayStart(date);
  d.setDate(d.getDate() + 1);
  return d;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function agentItems(schedule: ScheduleItem[], agentId: Id): ScheduleItem[] {
  return schedule
    .filter((i) => i.agentId === agentId)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Premier créneau libre d'au moins `durationMin` minutes, à partir de `from`,
 * dans les heures ouvrées, sans chevaucher le planning existant de l'agent.
 */
export function findNextFreeSlot(
  schedule: ScheduleItem[],
  agentId: Id,
  from: Date,
  durationMin: number,
): { start: Date; end: Date } {
  const items = agentItems(schedule, agentId).map((i) => ({
    start: new Date(i.start),
    end: new Date(i.end),
  }));
  const duration = durationMin * MINUTE;
  let cursor = roundUpToSlot(from);

  for (let guard = 0; guard < 500; guard++) {
    if (cursor < dayStart(cursor)) cursor = dayStart(cursor);
    if (cursor.getTime() + duration > dayEnd(cursor).getTime()) {
      cursor = nextDayStart(cursor);
      continue;
    }
    const end = new Date(cursor.getTime() + duration);
    const clash = items.find((i) => overlaps(cursor, end, i.start, i.end));
    if (!clash) return { start: cursor, end };
    cursor = roundUpToSlot(clash.end);
  }
  // Repli théorique : planning saturé sur la période explorée.
  return { start: cursor, end: new Date(cursor.getTime() + duration) };
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
