import type {
  Agent,
  ClientCompany,
  Id,
  InterventionInput,
  InterventionReport,
  Requester,
  Site,
  Team,
  Ticket,
  TicketCategory,
  TicketPriority,
  WorkspaceData,
} from "@/core/domain/types";

/**
 * Contrats des services IA.
 *
 * `mode` permet à l'interface d'indiquer honnêtement l'origine des résultats.
 * Une implémentation « live » appellera un modèle côté serveur (route API),
 * jamais directement depuis le navigateur.
 */
export type AiMode = "simulated" | "live";

export interface TroubleshootingStep {
  id: string;
  label: string;
  /** Action rapide correspondante, ajoutable au compte rendu. */
  quickActionId?: string;
}

export interface TroubleshootingSuggestion {
  id: string;
  articleRef: string;
  title: string;
  probableCause: string;
  steps: TroubleshootingStep[];
  relevance: "high" | "medium" | "low";
  matchedTerms: string[];
}

export interface ClassificationSuggestion {
  category: TicketCategory;
  priority: TicketPriority;
  teamId: Id | null;
  signals: string[];
}

export interface SimilarTicket {
  ticketId: Id;
  reference: string;
  title: string;
  resolution: string;
}

export interface AssistantInsight {
  mode: AiMode;
  suggestions: TroubleshootingSuggestion[];
  classification: ClassificationSuggestion;
  similar: SimilarTicket[];
}

export interface AssistantProvider {
  readonly mode: AiMode;
  analyzeTicket(input: { ticket: Ticket; data: WorkspaceData }): AssistantInsight;
}

export interface ReportContext {
  ticket: Ticket;
  requester?: Requester;
  company?: ClientCompany;
  site?: Site;
  agent?: Agent;
  targetTeam?: Team;
  input: InterventionInput;
  now: Date;
}

export interface ReportComposer {
  readonly mode: AiMode;
  readonly id: string;
  compose(ctx: ReportContext): InterventionReport;
}
