import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(p: { firstName: string; lastName: string }) {
  const first = p.firstName.replace(/^Dr\s+/, "");
  return `${first.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
}

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

export function telHref(phone: string) {
  return `tel:+33${phone.replace(/\s/g, "").replace(/^0/, "")}`;
}

/** « 1 ticket ouvert », « 3 tickets ouverts », « 0 ticket ouvert ». */
export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}
