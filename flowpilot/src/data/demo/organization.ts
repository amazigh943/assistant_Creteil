import type { Agent, ClientCompany, Organization, Requester, Site, Team } from "@/core/domain/types";

/**
 * Organisation FICTIVE de démonstration.
 * Téléphones : plages réservées à la fiction par l'ARCEP (01 99 00…, 06 39 98…).
 * E-mails : domaine réservé « .example » (RFC 2606).
 */
export const ORG_ID = "org-cobalt";

export const organization: Organization = {
  id: ORG_ID,
  name: "Cobalt Infogérance",
  slug: "cobalt",
  timezone: "Europe/Paris",
  locale: "fr-FR",
};

const o = { organizationId: ORG_ID };

export const teams: Team[] = [
  {
    ...o,
    id: "team-n1",
    name: "Support N1",
    shortName: "N1",
    description: "Accueil, comptes, messagerie et logiciels courants",
    color: "teal",
    handles: ["access", "email", "software"],
  },
  {
    ...o,
    id: "team-n2",
    name: "Systèmes & N2",
    shortName: "N2",
    description: "Serveurs, annuaire, escalades techniques",
    color: "blue",
    handles: [],
  },
  {
    ...o,
    id: "team-net",
    name: "Réseau & Télécom",
    shortName: "NET",
    description: "VPN, Wi-Fi, téléphonie et infrastructure réseau",
    color: "amber",
    handles: ["network", "telephony"],
  },
  {
    ...o,
    id: "team-field",
    name: "Proximité",
    shortName: "PRX",
    description: "Interventions sur site, matériel et impression",
    color: "rose",
    handles: ["hardware", "printing"],
  },
];

const agent = (
  id: string,
  teamId: string,
  firstName: string,
  lastName: string,
  title: string,
  presence: Agent["presence"] = "available",
): Agent => ({
  ...o,
  id,
  teamId,
  firstName,
  lastName,
  title,
  presence,
  email: `${firstName}.${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z.]/g, "") + "@cobalt.example",
});

export const CURRENT_AGENT_ID = "ag-ines";

export const agents: Agent[] = [
  agent("ag-ines", "team-n1", "Inès", "Morel", "Technicienne support N1"),
  agent("ag-thomas", "team-n1", "Thomas", "Garnier", "Technicien support N1", "on_call"),
  agent("ag-sarah", "team-n1", "Sarah", "Benali", "Technicienne support N1"),
  agent("ag-lucas", "team-n1", "Lucas", "Fontaine", "Technicien support N1", "offline"),
  agent("ag-amina", "team-n1", "Amina", "Diallo", "Technicienne support N1"),
  agent("ag-julien", "team-n2", "Julien", "Lefèvre", "Responsable systèmes"),
  agent("ag-camille", "team-n2", "Camille", "Roux", "Ingénieure systèmes"),
  agent("ag-mehdi", "team-n2", "Mehdi", "Haddad", "Ingénieur systèmes", "away"),
  agent("ag-nicolas", "team-net", "Nicolas", "Perrin", "Technicien réseau"),
  agent("ag-lea", "team-net", "Léa", "Chevalier", "Technicienne télécom"),
  agent("ag-hugo", "team-field", "Hugo", "Marchand", "Technicien de proximité"),
  agent("ag-chloe", "team-field", "Chloé", "Lambert", "Technicienne de proximité", "on_call"),
];

export const companies: ClientCompany[] = [
  { ...o, id: "co-valfleuri", name: "Clinique du Val Fleuri", sector: "Santé" },
  { ...o, id: "co-arnaud", name: "Cabinet Arnaud & Associés", sector: "Expertise comptable" },
  { ...o, id: "co-habitat", name: "Habitat Seine-Amont", sector: "Logement social" },
  { ...o, id: "co-mercier", name: "Transports Mercier", sector: "Logistique" },
  { ...o, id: "co-lumen", name: "Atelier Lumen", sector: "Architecture" },
];

export const sites: Site[] = [
  { ...o, id: "si-vf-main", companyId: "co-valfleuri", name: "Site principal", city: "Créteil", address: "12 allée des Tilleuls" },
  { ...o, id: "si-vf-consult", companyId: "co-valfleuri", name: "Centre de consultations", city: "Saint-Maur-des-Fossés", address: "4 rue du Port" },
  { ...o, id: "si-ar-siege", companyId: "co-arnaud", name: "Siège", city: "Paris 8e", address: "27 rue de la Bienfaisance" },
  { ...o, id: "si-ar-vincennes", companyId: "co-arnaud", name: "Agence de Vincennes", city: "Vincennes", address: "9 avenue du Château" },
  { ...o, id: "si-hs-dg", companyId: "co-habitat", name: "Direction générale", city: "Ivry-sur-Seine", address: "50 quai Marcel-Boyer" },
  { ...o, id: "si-hs-vitry", companyId: "co-habitat", name: "Agence de Vitry", city: "Vitry-sur-Seine", address: "18 rue Camille-Groult" },
  { ...o, id: "si-hs-choisy", companyId: "co-habitat", name: "Agence de Choisy", city: "Choisy-le-Roi", address: "3 place de l'Église" },
  { ...o, id: "si-tm-rungis", companyId: "co-mercier", name: "Plateforme logistique", city: "Rungis", address: "Zone Delta, bâtiment C" },
  { ...o, id: "si-tm-siege", companyId: "co-mercier", name: "Siège", city: "Orly", address: "7 rue des Hauts-Vents" },
  { ...o, id: "si-lu-studio", companyId: "co-lumen", name: "Studio", city: "Montreuil", address: "41 rue de Paris" },
];

const requester = (
  id: string,
  companyId: string,
  siteId: string,
  firstName: string,
  lastName: string,
  jobTitle: string,
  phone: string,
  domain: string,
  vip = false,
): Requester => ({
  ...o,
  id,
  companyId,
  siteId,
  firstName,
  lastName,
  jobTitle,
  phone,
  vip,
  email: `${firstName.charAt(0)}.${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z.]/g, "") + `@${domain}.example`,
});

export const requesters: Requester[] = [
  requester("rq-dupuis", "co-valfleuri", "si-vf-main", "Martine", "Dupuis", "Responsable de l'accueil", "01 99 00 12 41", "valfleuri", true),
  requester("rq-nguyen", "co-valfleuri", "si-vf-main", "Kevin", "Nguyen", "Secrétaire médical", "01 99 00 12 57", "valfleuri"),
  requester("rq-roche", "co-valfleuri", "si-vf-consult", "Dr Élise", "Roche", "Médecin coordinatrice", "06 39 98 20 14", "valfleuri", true),
  requester("rq-baptiste", "co-valfleuri", "si-vf-consult", "Yanis", "Baptiste", "Agent administratif", "01 99 00 12 63", "valfleuri"),
  requester("rq-arnaud", "co-arnaud", "si-ar-siege", "Philippe", "Arnaud", "Associé gérant", "06 39 98 31 02", "arnaud-associes", true),
  requester("rq-meunier", "co-arnaud", "si-ar-siege", "Claire", "Meunier", "Collaboratrice comptable", "01 99 00 34 18", "arnaud-associes"),
  requester("rq-petit", "co-arnaud", "si-ar-vincennes", "Romain", "Petit", "Chef de mission", "01 99 00 34 26", "arnaud-associes"),
  requester("rq-traore", "co-habitat", "si-hs-dg", "Aïssatou", "Traoré", "Responsable comptabilité", "01 99 00 45 70", "habitat-seine"),
  requester("rq-girard", "co-habitat", "si-hs-vitry", "Sophie", "Girard", "Chargée de clientèle", "01 99 00 45 82", "habitat-seine"),
  requester("rq-legrand", "co-habitat", "si-hs-choisy", "Marc", "Legrand", "Responsable d'agence", "06 39 98 45 91", "habitat-seine"),
  requester("rq-colin", "co-habitat", "si-hs-dg", "Nadia", "Colin", "Assistante RH", "01 99 00 45 33", "habitat-seine"),
  requester("rq-mercier", "co-mercier", "si-tm-siege", "Laurent", "Mercier", "Directeur général", "06 39 98 52 07", "transports-mercier", true),
  requester("rq-fernandes", "co-mercier", "si-tm-rungis", "Paulo", "Fernandes", "Chef de quai", "06 39 98 52 66", "transports-mercier"),
  requester("rq-blanc", "co-mercier", "si-tm-siege", "Julie", "Blanc", "Responsable exploitation", "01 99 00 52 19", "transports-mercier"),
  requester("rq-simon", "co-lumen", "si-lu-studio", "Anaïs", "Simon", "Architecte associée", "06 39 98 60 48", "atelier-lumen"),
  requester("rq-david", "co-lumen", "si-lu-studio", "Bastien", "David", "Dessinateur projeteur", "01 99 00 60 52", "atelier-lumen"),
];
