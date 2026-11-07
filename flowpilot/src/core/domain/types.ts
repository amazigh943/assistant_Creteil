/**
 * FlowPilot — modèle de domaine partagé.
 *
 * Ce fichier ne dépend d'aucun framework : il est destiné à être partagé entre
 * FlowPilot Cloud et FlowPilot Connect. Les dates sont des chaînes ISO 8601 pour
 * rester sérialisables (stockage, API, connecteurs).
 */

export type Id = string;
export type IsoDateTime = string;

/* ------------------------------------------------------------------ */
/* Organisation                                                        */
/* ------------------------------------------------------------------ */

export interface Organization {
  id: Id;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
}

/** Toute entité appartenant à une organisation (tenant). */
export interface TenantOwned {
  organizationId: Id;
}

export type TeamColor = "teal" | "blue" | "amber" | "rose";

export interface Team extends TenantOwned {
  id: Id;
  name: string;
  shortName: string;
  description: string;
  color: TeamColor;
  /** Catégories traitées en priorité par l'équipe (routage). */
  handles: TicketCategory[];
}

export type AgentPresence = "available" | "on_call" | "away" | "offline";

export interface Agent extends TenantOwned {
  id: Id;
  teamId: Id;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  presence: AgentPresence;
}

/* ------------------------------------------------------------------ */
/* Clients (entreprises accompagnées)                                  */
/* ------------------------------------------------------------------ */

export interface ClientCompany extends TenantOwned {
  id: Id;
  name: string;
  sector: string;
}

export interface Site extends TenantOwned {
  id: Id;
  companyId: Id;
  name: string;
  city: string;
  address: string;
}

export interface Requester extends TenantOwned {
  id: Id;
  companyId: Id;
  siteId: Id;
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  email: string;
  vip: boolean;
}

/* ------------------------------------------------------------------ */
/* Tickets                                                             */
/* ------------------------------------------------------------------ */

export type TicketPriority = "critical" | "high" | "medium" | "low";

export type TicketStatus =
  | "new"
  | "open"
  | "in_progress"
  | "waiting"
  | "scheduled"
  | "resolved";

export type TicketCategory =
  | "access"
  | "email"
  | "network"
  | "hardware"
  | "printing"
  | "software"
  | "telephony";

export type TicketChannel = "phone" | "email" | "portal";

export interface Ticket extends TenantOwned {
  id: Id;
  /** Référence lisible, ex. « FP-1042 ». */
  reference: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  channel: TicketChannel;
  requesterId: Id;
  teamId: Id;
  assigneeId: Id | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Échéance de prise en charge / résolution (SLA). */
  dueAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
  /** Nombre de tentatives d'appel sans réponse consécutives. */
  callAttempts: number;
}

export type ActorRef =
  | { kind: "agent"; agentId: Id }
  | { kind: "requester"; requesterId: Id }
  | { kind: "system" };

export type TicketEventKind =
  | "created"
  | "call"
  | "note"
  | "status_changed"
  | "assigned"
  | "report"
  | "reminder"
  | "planning"
  | "notification";

export interface TicketEvent extends TenantOwned {
  id: Id;
  ticketId: Id;
  at: IsoDateTime;
  actor: ActorRef;
  kind: TicketEventKind;
  title: string;
  body?: string;
  report?: InterventionReport;
  /** Vrai si l'événement a été produit par le moteur d'automatisation. */
  automated: boolean;
}

/* ------------------------------------------------------------------ */
/* Rappels & planning                                                  */
/* ------------------------------------------------------------------ */

export interface Reminder extends TenantOwned {
  id: Id;
  ticketId: Id;
  agentId: Id;
  dueAt: IsoDateTime;
  title: string;
  done: boolean;
  createdBy: "automation" | "agent" | "seed";
}

export type ScheduleKind = "callback" | "remote" | "onsite" | "meeting" | "break";

export interface ScheduleItem extends TenantOwned {
  id: Id;
  agentId: Id;
  ticketId: Id | null;
  kind: ScheduleKind;
  title: string;
  start: IsoDateTime;
  end: IsoDateTime;
  location?: string;
  createdBy: "automation" | "agent" | "seed";
}

/* ------------------------------------------------------------------ */
/* Interventions                                                       */
/* ------------------------------------------------------------------ */

export type InterventionOutcome = "resolved" | "no_answer" | "follow_up" | "transfer";

export type FollowUpMode = "callback" | "remote" | "onsite";

export interface InterventionInput {
  ticketId: Id;
  agentId: Id;
  outcome: InterventionOutcome;
  quickActionIds: string[];
  note: string;
  /** Durée de l'appel mesurée, en secondes (0 si aucun appel chronométré). */
  callDurationSec: number;
  followUp?: { mode: FollowUpMode; start: IsoDateTime; durationMin: number };
  transfer?: { teamId: Id; reasonIds: string[] };
}

/** Compte rendu structuré, éditable par l'agent avant enregistrement. */
export interface InterventionReport {
  outcome: InterventionOutcome;
  summary: string;
  context: string;
  actions: string[];
  result: string;
  nextStep: string;
  durationMin: number;
  /** Identifie le générateur ayant produit le brouillon. */
  generatedBy: string;
  editedByAgent: boolean;
}

/* ------------------------------------------------------------------ */
/* Agrégat de travail                                                  */
/* ------------------------------------------------------------------ */

/** Ensemble des données d'une organisation manipulées par le moteur. */
export interface WorkspaceData {
  organization: Organization;
  teams: Team[];
  agents: Agent[];
  companies: ClientCompany[];
  sites: Site[];
  requesters: Requester[];
  tickets: Ticket[];
  events: TicketEvent[];
  reminders: Reminder[];
  schedule: ScheduleItem[];
}

/** Contexte d'exécution injecté dans le moteur (horloge + générateur d'identifiants). */
export interface EngineContext {
  now: Date;
  newId: (prefix: string) => Id;
}
