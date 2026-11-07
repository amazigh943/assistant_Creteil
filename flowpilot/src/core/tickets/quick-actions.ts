import type { InterventionOutcome, TicketCategory } from "../domain/types";

/**
 * Actions rapides proposées à l'agent pendant une intervention.
 * `label` est affiché sur la puce ; `report` est la formulation utilisée
 * dans le compte rendu.
 */
export interface QuickAction {
  id: string;
  label: string;
  report: string;
}

const qa = (id: string, label: string, report: string): QuickAction => ({ id, label, report });

const COMMON: QuickAction[] = [
  qa("remote-session", "Prise en main à distance", "Prise en main à distance du poste."),
  qa("reboot", "Redémarrage du poste", "Redémarrage complet du poste."),
  qa("user-guided", "Utilisateur guidé", "Utilisateur guidé pas à pas au téléphone."),
];

const BY_CATEGORY: Record<TicketCategory, QuickAction[]> = {
  access: [
    qa("pwd-reset", "Mot de passe réinitialisé", "Réinitialisation du mot de passe et déverrouillage du compte."),
    qa("mfa-reset", "MFA réenrôlée", "Réenrôlement de l'authentification multifacteur."),
    qa("rights-check", "Droits vérifiés", "Vérification des groupes et des droits d'accès."),
  ],
  email: [
    qa("outlook-profile", "Profil Outlook recréé", "Recréation du profil Outlook."),
    qa("mailbox-quota", "Quota boîte vérifié", "Contrôle du quota de la boîte aux lettres."),
    qa("ost-rebuild", "Cache OST reconstruit", "Reconstruction du fichier de cache OST."),
  ],
  network: [
    qa("vpn-reinstall", "Client VPN réinstallé", "Réinstallation du client VPN."),
    qa("network-reset", "Pile réseau réinitialisée", "Réinitialisation de la pile réseau (IP, DNS)."),
    qa("cable-check", "Câblage vérifié", "Vérification du câblage et du port réseau."),
  ],
  hardware: [
    qa("driver-update", "Pilotes mis à jour", "Mise à jour des pilotes matériels."),
    qa("hw-diagnostic", "Diagnostic matériel", "Diagnostic matériel constructeur lancé."),
    qa("peripheral-swap", "Périphérique remplacé", "Remplacement du périphérique défectueux."),
  ],
  printing: [
    qa("spooler-restart", "Spouleur relancé", "Redémarrage du service de spouleur d'impression."),
    qa("printer-readd", "Imprimante réinstallée", "Suppression et réinstallation de l'imprimante."),
    qa("queue-purge", "File d'impression purgée", "Purge de la file d'attente d'impression."),
  ],
  software: [
    qa("app-repair", "Application réparée", "Réparation de l'installation de l'application."),
    qa("cache-clear", "Cache vidé", "Suppression du cache applicatif."),
    qa("license-check", "Licence vérifiée", "Vérification de l'attribution de licence."),
  ],
  telephony: [
    qa("softphone-reset", "Softphone reconfiguré", "Reconfiguration du softphone."),
    qa("line-test", "Ligne testée", "Test d'appel entrant et sortant."),
    qa("headset-check", "Casque vérifié", "Vérification du casque et des périphériques audio."),
  ],
};

const BY_OUTCOME: Record<InterventionOutcome, QuickAction[]> = {
  resolved: [
    qa("user-confirmed", "Confirmé par l'utilisateur", "Fonctionnement confirmé par l'utilisateur."),
  ],
  no_answer: [
    qa("voicemail", "Message vocal laissé", "Message vocal laissé sur la ligne de l'utilisateur."),
    qa("line-busy", "Ligne occupée", "Ligne occupée lors de l'appel."),
    qa("no-voicemail", "Pas de messagerie", "Aucune messagerie vocale disponible."),
  ],
  follow_up: [
    qa("part-ordered", "Pièce à commander", "Une pièce de remplacement doit être commandée."),
    qa("user-unavailable", "Utilisateur indisponible", "L'utilisateur n'était pas disponible pour poursuivre."),
    qa("test-pending", "Test à confirmer", "Un test de validation reste à réaliser avec l'utilisateur."),
  ],
  transfer: [
    qa("n1-diagnostic", "Diagnostic N1 effectué", "Diagnostic de premier niveau effectué."),
    qa("logs-collected", "Journaux collectés", "Journaux et captures collectés et joints au ticket."),
  ],
};

/** Motifs de transfert sélectionnables. */
export const TRANSFER_REASONS: QuickAction[] = [
  qa("out-of-scope", "Hors périmètre de l'équipe", "La demande sort du périmètre de l'équipe actuelle."),
  qa("admin-rights", "Droits d'administration requis", "L'intervention nécessite des droits d'administration."),
  qa("onsite-needed", "Déplacement sur site requis", "Une intervention physique sur site est nécessaire."),
  qa("infra-issue", "Incident d'infrastructure suspecté", "Un incident d'infrastructure est suspecté."),
];

export function quickActionsFor(
  category: TicketCategory,
  outcome: InterventionOutcome,
): QuickAction[] {
  const base = outcome === "no_answer" ? [] : [...BY_CATEGORY[category], ...COMMON];
  return [...BY_OUTCOME[outcome], ...base];
}

const ALL: Map<string, QuickAction> = new Map(
  [...COMMON, ...Object.values(BY_CATEGORY).flat(), ...Object.values(BY_OUTCOME).flat(), ...TRANSFER_REASONS].map(
    (a) => [a.id, a],
  ),
);

export function quickActionById(id: string): QuickAction | undefined {
  return ALL.get(id);
}
