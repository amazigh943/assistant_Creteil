import type {
  FollowUpMode,
  InterventionOutcome,
  ScheduleKind,
  TicketCategory,
  TicketChannel,
  TicketPriority,
  TicketStatus,
} from "../domain/types";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  new: "Nouveau",
  open: "À traiter",
  in_progress: "En cours",
  waiting: "En attente",
  scheduled: "Planifié",
  resolved: "Résolu",
};

/** Ordre d'affichage des statuts (du plus actionnable au moins actionnable). */
export const STATUS_ORDER: TicketStatus[] = [
  "in_progress",
  "new",
  "open",
  "waiting",
  "scheduled",
  "resolved",
];

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  critical: "Critique",
  high: "Haute",
  medium: "Normale",
  low: "Basse",
};

export const PRIORITY_ORDER: TicketPriority[] = ["critical", "high", "medium", "low"];

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  access: "Accès & comptes",
  email: "Messagerie",
  network: "Réseau & VPN",
  hardware: "Poste de travail",
  printing: "Impression",
  software: "Logiciels métier",
  telephony: "Téléphonie",
};

export const CHANNEL_LABEL: Record<TicketChannel, string> = {
  phone: "Téléphone",
  email: "E-mail",
  portal: "Portail",
};

export const OUTCOME_LABEL: Record<InterventionOutcome, string> = {
  resolved: "Problème résolu",
  no_answer: "Aucune réponse",
  follow_up: "Intervention à poursuivre",
  transfer: "Transférer le ticket",
};

export const FOLLOW_UP_MODE_LABEL: Record<FollowUpMode, string> = {
  callback: "Rappel téléphonique",
  remote: "Prise en main à distance",
  onsite: "Intervention sur site",
};

export const SCHEDULE_KIND_LABEL: Record<ScheduleKind, string> = {
  callback: "Rappel",
  remote: "À distance",
  onsite: "Sur site",
  meeting: "Réunion",
  break: "Pause",
};
