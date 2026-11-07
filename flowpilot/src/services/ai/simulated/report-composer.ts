import type { InterventionReport } from "@/core/domain/types";
import { formatSlot } from "@/core/planning/format";
import { FOLLOW_UP_MODE_LABEL } from "@/core/tickets/labels";
import { quickActionById } from "@/core/tickets/quick-actions";
import type { ReportComposer, ReportContext } from "../types";
import { firstSentence, tidyNote } from "./text";

function durationLabel(min: number) {
  return min > 0 ? ` (${min} min)` : "";
}

/**
 * Générateur de compte rendu DÉTERMINISTE fondé sur des modèles de phrases.
 * Mêmes entrées → même brouillon. Aucune IA n'est utilisée.
 */
export const templateReportComposer: ReportComposer = {
  mode: "simulated",
  id: "template-v1",
  compose(ctx: ReportContext): InterventionReport {
    const { ticket, requester, company, site, input, targetTeam, now } = ctx;
    const who = requester ? `${requester.firstName} ${requester.lastName}` : "L'utilisateur";
    const where = [company?.name, site?.name].filter(Boolean).join(" — ");
    const durationMin = Math.ceil(input.callDurationSec / 60);
    const note = tidyNote(input.note);

    const actions = input.quickActionIds
      .map((id) => quickActionById(id)?.report)
      .filter((a): a is string => Boolean(a));

    const context = `${who}${requester ? ` (${requester.jobTitle}${where ? `, ${where}` : ""})` : ""} signale : ${firstSentence(ticket.description)}`;

    let summary: string;
    let result: string;
    let nextStep: string;

    switch (input.outcome) {
      case "resolved":
        summary = `Incident résolu avec ${who}${durationLabel(durationMin)}.`;
        result = note || "Le problème est résolu.";
        nextStep = "Aucune action requise. E-mail de clôture préparé pour l'utilisateur.";
        break;
      case "no_answer": {
        const attempt = ticket.callAttempts + 1;
        summary = `Tentative d'appel n°${attempt} sans réponse.`;
        result = [
          requester ? `Appel au ${requester.phone} resté sans réponse.` : "Appel resté sans réponse.",
          note,
        ]
          .filter(Boolean)
          .join(" ");
        nextStep =
          attempt >= 3
            ? "Dernière relance envoyée ; clôture proposée sans retour sous 24 h."
            : "Nouvel appel programmé automatiquement au prochain créneau libre.";
        break;
      }
      case "follow_up": {
        const f = input.followUp;
        const mode = f ? FOLLOW_UP_MODE_LABEL[f.mode] : "Suite";
        const when = f ? formatSlot(new Date(f.start), now) : "à planifier";
        summary = `Intervention à poursuivre — ${mode.toLowerCase()} ${when}.`;
        result = note || "Le problème n'est pas encore entièrement résolu.";
        nextStep = f
          ? `${mode} ${when}, durée prévue ${f.durationMin} min.`
          : "Créneau à planifier.";
        break;
      }
      case "transfer": {
        const reasons = (input.transfer?.reasonIds ?? [])
          .map((id) => quickActionById(id)?.report)
          .filter(Boolean);
        summary = `Ticket transféré à ${targetTeam?.name ?? "une autre équipe"}.`;
        result = [reasons.join(" ") || "Transfert nécessaire pour poursuivre le traitement.", note]
          .filter(Boolean)
          .join(" ");
        nextStep = `Prise en charge par ${targetTeam?.name ?? "l'équipe destinataire"} avec ce compte rendu.`;
        break;
      }
    }

    return {
      outcome: input.outcome,
      summary,
      context,
      actions,
      result,
      nextStep,
      durationMin,
      generatedBy: this.id,
      editedByAgent: false,
    };
  },
};
