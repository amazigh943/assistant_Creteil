import { isSameDay } from "@/core/planning/slots";

const timeFmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const shortDayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export const formatTime = (d: Date | string) => timeFmt.format(new Date(d));
export const formatDay = (d: Date | string) => dayFmt.format(new Date(d));

export function formatShortDateTime(d: Date | string, now: Date) {
  const date = new Date(d);
  if (isSameDay(date, now)) return formatTime(date);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (isSameDay(date, y)) return `Hier, ${formatTime(date)}`;
  const t = new Date(now);
  t.setDate(now.getDate() + 1);
  if (isSameDay(date, t)) return `Demain, ${formatTime(date)}`;
  return `${shortDayFmt.format(date)}, ${formatTime(date)}`;
}

/** « à l'instant », « il y a 12 min », « il y a 3 h », « il y a 2 j ». */
export function formatRelative(d: Date | string, now: Date) {
  const diff = now.getTime() - new Date(d).getTime();
  const future = diff < 0;
  const abs = Math.abs(diff);
  const min = Math.round(abs / 60000);
  let value: string;
  if (min < 1) return "à l'instant";
  if (min < 60) value = `${min} min`;
  else if (min < 60 * 24) value = `${Math.round(min / 60)} h`;
  else value = `${Math.round(min / 1440)} j`;
  return future ? `dans ${value}` : `il y a ${value}`;
}

/** Durée restante avant échéance, compacte : « 22 min », « 3 h », « -35 min ». */
export function formatCountdown(d: Date | string, now: Date) {
  const diff = new Date(d).getTime() - now.getTime();
  const min = Math.round(diff / 60000);
  const abs = Math.abs(min);
  const value = abs < 60 ? `${abs} min` : abs < 1440 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} j`;
  return min < 0 ? `dépassé de ${value}` : value;
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
