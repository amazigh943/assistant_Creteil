import type { AutomationEffect } from "@/core/automation/types";
import type { Id, Ticket, TicketEvent } from "@/core/domain/types";

/**
 * Contrat d'un connecteur vers un outil de ticketing existant (FlowPilot Connect).
 *
 * AUCUN connecteur n'est implémenté dans ce prototype. Ce contrat fixe la frontière :
 * le moteur métier (`src/core`) produit des effets typés ; un connecteur sait les
 * traduire vers l'outil cible (ex. GLPI) et, inversement, importer ses tickets
 * dans le modèle de domaine FlowPilot.
 */
export interface TicketingConnector {
  /** Identifiant technique, ex. « glpi ». */
  readonly id: string;
  readonly displayName: string;

  /** Importe les tickets modifiés depuis une date donnée, convertis au modèle FlowPilot. */
  pullTickets(since: Date): Promise<{ tickets: Ticket[]; events: TicketEvent[] }>;

  /** Applique dans l'outil externe les effets décidés par le moteur d'automatisation. */
  pushEffects(ticketId: Id, effects: AutomationEffect[]): Promise<void>;

  /** Ajoute un compte rendu ou une note de suivi dans l'outil externe. */
  pushEvent(event: TicketEvent): Promise<void>;
}
