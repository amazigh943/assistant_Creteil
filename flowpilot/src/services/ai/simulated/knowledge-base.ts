import type { TicketCategory } from "@/core/domain/types";
import type { TroubleshootingStep } from "../types";

/**
 * Base de connaissances FICTIVE utilisée par l'assistant simulé.
 * Les mots-clés sont normalisés (minuscules, sans accents).
 */
export interface KbArticle {
  ref: string;
  category: TicketCategory;
  title: string;
  probableCause: string;
  keywords: string[];
  steps: TroubleshootingStep[];
}

const s = (id: string, label: string, quickActionId?: string): TroubleshootingStep => ({
  id,
  label,
  quickActionId,
});

export const KNOWLEDGE_BASE: KbArticle[] = [
  {
    ref: "KB-0112",
    category: "access",
    title: "Compte verrouillé après changement de mot de passe",
    probableCause:
      "Un appareil (smartphone, session ouverte) continue d'utiliser l'ancien mot de passe et verrouille le compte.",
    keywords: ["verrouille", "mot de passe", "bloque", "session", "connexion impossible", "identifiant"],
    steps: [
      s("kb112-1", "Vérifier l'état du compte et l'origine des échecs d'authentification"),
      s("kb112-2", "Réinitialiser le mot de passe et déverrouiller le compte", "pwd-reset"),
      s("kb112-3", "Mettre à jour le mot de passe sur le smartphone de l'utilisateur"),
    ],
  },
  {
    ref: "KB-0127",
    category: "access",
    title: "Authentification multifacteur : code refusé ou nouveau téléphone",
    probableCause: "L'application d'authentification n'est plus associée au compte (changement de téléphone).",
    keywords: ["mfa", "authenticator", "code", "double authentification", "nouveau telephone", "2fa"],
    steps: [
      s("kb127-1", "Confirmer l'identité de l'utilisateur (procédure de rappel)"),
      s("kb127-2", "Supprimer les méthodes MFA existantes et réenrôler", "mfa-reset"),
    ],
  },
  {
    ref: "KB-0203",
    category: "email",
    title: "Outlook ne se synchronise plus ou reste « Déconnecté »",
    probableCause: "Profil Outlook ou cache OST corrompu après une mise à jour.",
    keywords: ["outlook", "synchronis", "deconnecte", "mail", "messagerie", "boite", "courriel"],
    steps: [
      s("kb203-1", "Vérifier l'accès au webmail pour isoler le poste"),
      s("kb203-2", "Reconstruire le cache OST", "ost-rebuild"),
      s("kb203-3", "Recréer le profil Outlook si le problème persiste", "outlook-profile"),
    ],
  },
  {
    ref: "KB-0219",
    category: "email",
    title: "Boîte aux lettres pleine : envois rejetés",
    probableCause: "Quota de la boîte aux lettres atteint.",
    keywords: ["pleine", "quota", "espace", "envoi impossible", "rejet", "taille"],
    steps: [
      s("kb219-1", "Contrôler le quota et la taille des dossiers", "mailbox-quota"),
      s("kb219-2", "Activer l'archivage en ligne ou guider le nettoyage"),
    ],
  },
  {
    ref: "KB-0305",
    category: "network",
    title: "VPN : connexion établie puis coupée en télétravail",
    probableCause: "Client VPN obsolète ou conflit DNS avec la box du domicile.",
    keywords: ["vpn", "teletravail", "coupe", "deconnexion", "domicile", "tunnel", "forticlient"],
    steps: [
      s("kb305-1", "Vérifier la version du client VPN"),
      s("kb305-2", "Réinitialiser la pile réseau (IP, DNS)", "network-reset"),
      s("kb305-3", "Réinstaller le client VPN", "vpn-reinstall"),
    ],
  },
  {
    ref: "KB-0318",
    category: "network",
    title: "Plus d'accès réseau sur un poste fixe",
    probableCause: "Câble ou port de brassage défectueux, ou VLAN mal affecté.",
    keywords: ["reseau", "internet", "wifi", "cable", "pas de connexion", "lent", "partage", "lecteur"],
    steps: [
      s("kb318-1", "Vérifier le câblage et changer de port", "cable-check"),
      s("kb318-2", "Contrôler l'adresse IP obtenue (DHCP)"),
      s("kb318-3", "Réinitialiser la pile réseau", "network-reset"),
    ],
  },
  {
    ref: "KB-0410",
    category: "hardware",
    title: "Poste lent ou qui ne démarre plus correctement",
    probableCause: "Disque saturé, mise à jour bloquée ou défaillance matérielle.",
    keywords: ["lent", "demarre", "ecran", "bleu", "plante", "freeze", "ventilateur", "portable", "batterie"],
    steps: [
      s("kb410-1", "Redémarrer complètement le poste", "reboot"),
      s("kb410-2", "Lancer le diagnostic matériel constructeur", "hw-diagnostic"),
      s("kb410-3", "Mettre à jour les pilotes", "driver-update"),
    ],
  },
  {
    ref: "KB-0423",
    category: "hardware",
    title: "Écran externe ou station d'accueil non détectés",
    probableCause: "Pilote de la station d'accueil ou firmware à mettre à jour.",
    keywords: ["ecran", "station", "dock", "moniteur", "hdmi", "usb-c", "clavier", "souris"],
    steps: [
      s("kb423-1", "Mettre à jour pilotes et firmware de la station", "driver-update"),
      s("kb423-2", "Tester avec un autre câble ou périphérique", "peripheral-swap"),
    ],
  },
  {
    ref: "KB-0507",
    category: "printing",
    title: "Impressions bloquées dans la file d'attente",
    probableCause: "Service de spouleur bloqué par un travail corrompu.",
    keywords: ["imprim", "impression", "file", "bloque", "spouleur", "scanner", "copieur"],
    steps: [
      s("kb507-1", "Purger la file d'impression", "queue-purge"),
      s("kb507-2", "Redémarrer le spouleur", "spooler-restart"),
      s("kb507-3", "Réinstaller l'imprimante si nécessaire", "printer-readd"),
    ],
  },
  {
    ref: "KB-0611",
    category: "software",
    title: "Logiciel métier : erreur au lancement après mise à jour",
    probableCause: "Cache applicatif incompatible avec la nouvelle version.",
    keywords: ["logiciel", "application", "erreur", "lancement", "mise a jour", "crash", "licence", "excel", "teams"],
    steps: [
      s("kb611-1", "Relever le message d'erreur exact et la version"),
      s("kb611-2", "Vider le cache applicatif", "cache-clear"),
      s("kb611-3", "Réparer l'installation", "app-repair"),
      s("kb611-4", "Vérifier l'attribution de licence", "license-check"),
    ],
  },
  {
    ref: "KB-0702",
    category: "telephony",
    title: "Softphone : pas de tonalité ou son à sens unique",
    probableCause: "Périphérique audio par défaut incorrect ou enregistrement SIP expiré.",
    keywords: ["telephone", "softphone", "tonalite", "son", "casque", "appel", "standard", "ligne"],
    steps: [
      s("kb702-1", "Vérifier le casque et le périphérique audio par défaut", "headset-check"),
      s("kb702-2", "Reconfigurer le softphone", "softphone-reset"),
      s("kb702-3", "Tester un appel entrant et sortant", "line-test"),
    ],
  },
];
