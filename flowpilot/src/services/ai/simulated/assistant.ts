import type { Ticket, TicketCategory, TicketPriority, WorkspaceData } from "@/core/domain/types";
import { CATEGORY_LABEL } from "@/core/tickets/labels";
import type {
  AssistantInsight,
  AssistantProvider,
  ClassificationSuggestion,
  SimilarTicket,
  TroubleshootingSuggestion,
} from "../types";
import { KNOWLEDGE_BASE } from "./knowledge-base";
import { firstSentence, normalize } from "./text";

const URGENCY_SIGNALS: { terms: string[]; priority: TicketPriority; label: string }[] = [
  {
    terms: ["tout le service", "plus personne", "plus aucun poste", "tous les postes", "production arretee", "urgence vitale"],
    priority: "critical",
    label: "impact collectif",
  },
  {
    terms: ["bloque", "impossible", "urgent", "ce matin", "rendez-vous patient", "direction"],
    priority: "high",
    label: "utilisateur bloqué",
  },
];

const PRIORITY_RANK: Record<TicketPriority, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function scoreArticles(text: string, category: TicketCategory) {
  return KNOWLEDGE_BASE.map((article) => {
    const matchedTerms = article.keywords.filter((k) => text.includes(k));
    const score = matchedTerms.length * 2 + (article.category === category ? 3 : 0);
    return { article, matchedTerms, score };
  })
    .filter((r) => r.score >= 3 && (r.matchedTerms.length > 0 || r.article.category === category))
    .sort((a, b) => b.score - a.score || a.article.ref.localeCompare(b.article.ref));
}

function classify(ticket: Ticket, text: string, data: WorkspaceData): ClassificationSuggestion {
  // Catégorie : celle dont les articles partagent le plus de mots-clés avec le ticket.
  const byCategory = new Map<TicketCategory, number>();
  for (const article of KNOWLEDGE_BASE) {
    const hits = article.keywords.filter((k) => text.includes(k)).length;
    byCategory.set(article.category, (byCategory.get(article.category) ?? 0) + hits);
  }
  const [bestCategory, bestHits] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0] ?? [
    ticket.category,
    0,
  ];
  const category = bestHits > (byCategory.get(ticket.category) ?? 0) ? bestCategory : ticket.category;

  const signals: string[] = [];
  let priority: TicketPriority = ticket.priority;
  for (const rule of URGENCY_SIGNALS) {
    const found = rule.terms.filter((t) => text.includes(t));
    if (found.length > 0) {
      signals.push(rule.label);
      if (PRIORITY_RANK[rule.priority] > PRIORITY_RANK[priority]) priority = rule.priority;
    }
  }
  const requester = data.requesters.find((r) => r.id === ticket.requesterId);
  if (requester?.vip) signals.push("demandeur VIP");
  signals.unshift(`catégorie « ${CATEGORY_LABEL[category]} »`);

  const team = data.teams.find((t) => t.handles.includes(category));
  return { category, priority, teamId: team?.id ?? null, signals };
}

function similarTickets(ticket: Ticket, data: WorkspaceData): SimilarTicket[] {
  return data.tickets
    .filter((t) => t.id !== ticket.id && t.status === "resolved" && t.category === ticket.category)
    .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))
    .slice(0, 2)
    .map((t) => {
      const report = data.events
        .filter((e) => e.ticketId === t.id && e.report)
        .sort((a, b) => b.at.localeCompare(a.at))[0]?.report;
      return {
        ticketId: t.id,
        reference: t.reference,
        title: t.title,
        resolution: report ? firstSentence(report.result, 140) : "Résolu sans compte rendu détaillé.",
      };
    });
}

/**
 * Assistant SIMULÉ : recherche par mots-clés dans une base de connaissances fictive.
 * Résultats déterministes, aucun modèle d'IA n'est appelé.
 */
export const simulatedAssistant: AssistantProvider = {
  mode: "simulated",
  analyzeTicket({ ticket, data }): AssistantInsight {
    const text = normalize(`${ticket.title} ${ticket.description}`);
    const suggestions: TroubleshootingSuggestion[] = scoreArticles(text, ticket.category)
      .slice(0, 3)
      .map(({ article, matchedTerms, score }) => ({
        id: article.ref,
        articleRef: article.ref,
        title: article.title,
        probableCause: article.probableCause,
        steps: article.steps,
        relevance: score >= 7 ? "high" : score >= 5 ? "medium" : "low",
        matchedTerms,
      }));

    return {
      mode: "simulated",
      suggestions,
      classification: classify(ticket, text, data),
      similar: similarTickets(ticket, data),
    };
  },
};
