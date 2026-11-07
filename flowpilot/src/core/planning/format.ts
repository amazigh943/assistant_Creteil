import { isSameDay } from "./slots";

const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const weekdayDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatTime(date: Date): string {
  return time.format(date);
}

/** « aujourd'hui à 16:15 », « demain à 09:00 », « lundi 9 novembre à 10:30 ». */
export function formatSlot(date: Date, now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (isSameDay(date, now)) return `aujourd'hui à ${formatTime(date)}`;
  if (isSameDay(date, tomorrow)) return `demain à ${formatTime(date)}`;
  return `${weekdayDate.format(date)} à ${formatTime(date)}`;
}
