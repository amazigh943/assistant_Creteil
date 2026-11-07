import type {
  ActorRef,
  Reminder,
  ScheduleItem,
  Ticket,
  TicketEvent,
  WorkspaceData,
} from "@/core/domain/types";
import { findNextFreeSlot } from "@/core/planning/slots";
import {
  agents,
  companies,
  CURRENT_AGENT_ID,
  organization,
  ORG_ID,
  requesters,
  sites,
  teams,
} from "./organization";
import { ticketSeeds } from "./tickets";

export { CURRENT_AGENT_ID };

const MIN = 60_000;
const o = { organizationId: ORG_ID };

function actor(ref: string): ActorRef {
  if (ref === "system") return { kind: "system" };
  if (ref.startsWith("rq-")) return { kind: "requester", requesterId: ref };
  if (ref === "requester") return { kind: "system" };
  return { kind: "agent", agentId: ref };
}

/**
 * Construit le jeu de données de démonstration, ancré sur `now`.
 * Les dates des tickets sont relatives ; le planning utilise des heures fixes du jour.
 */
export function createDemoWorkspace(now: Date): WorkspaceData {
  const rel = (minutes: number) => new Date(now.getTime() + minutes * MIN).toISOString();
  const at = (hour: number, minute = 0, dayOffset = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const tickets: Ticket[] = [];
  const events: TicketEvent[] = [];

  for (const seed of ticketSeeds) {
    const id = `t-${seed.n}`;
    const requester = requesters.find((r) => r.id === seed.requesterId);
    tickets.push({
      ...o,
      id,
      reference: `FP-${seed.n}`,
      title: seed.title,
      description: seed.description,
      category: seed.category,
      priority: seed.priority,
      status: seed.status,
      channel: seed.channel,
      requesterId: seed.requesterId,
      teamId: seed.teamId,
      assigneeId: seed.assigneeId,
      createdAt: rel(seed.createdAt),
      updatedAt: rel(Math.max(seed.createdAt, ...(seed.history ?? []).map((h) => h.at))),
      dueAt: rel(seed.dueAt),
      resolvedAt: seed.resolvedAt !== undefined ? rel(seed.resolvedAt) : null,
      callAttempts: seed.callAttempts ?? 0,
    });

    events.push({
      ...o,
      id: `evt-${seed.n}-0`,
      ticketId: id,
      at: rel(seed.createdAt),
      actor: requester ? { kind: "requester", requesterId: requester.id } : { kind: "system" },
      kind: "created",
      title:
        seed.channel === "phone"
          ? "Ticket créé suite à un appel"
          : seed.channel === "email"
            ? "Ticket créé depuis un e-mail"
            : "Ticket créé depuis le portail",
      automated: false,
    });

    (seed.history ?? []).forEach((h, i) => {
      events.push({
        ...o,
        id: `evt-${seed.n}-${i + 1}`,
        ticketId: id,
        at: rel(h.at),
        actor: h.actor === "requester" && requester ? { kind: "requester", requesterId: requester.id } : actor(h.actor),
        kind: h.kind,
        title: h.title,
        body: h.body,
        automated: h.automated ?? false,
        report: h.report
          ? {
              ...h.report,
              context: "",
              generatedBy: "seed",
              editedByAgent: false,
            }
          : undefined,
      });
    });
  }

  const slot = (
    id: string,
    agentId: string,
    kind: ScheduleItem["kind"],
    title: string,
    start: string,
    end: string,
    ticketId: string | null = null,
    location?: string,
  ): ScheduleItem => ({ ...o, id, agentId, kind, title, start, end, ticketId, location, createdBy: "seed" });

  // Créneaux d'Inès liés à des tickets : relatifs à « maintenant », mais toujours
  // placés dans les heures ouvrées et sans chevaucher son planning fixe.
  const inesFixed: ScheduleItem[] = [
    slot("s-ines-1", "ag-ines", "meeting", "Point d'équipe N1", at(9), at(9, 30)),
    slot("s-ines-2", "ag-ines", "break", "Pause déjeuner", at(12, 30), at(13, 30)),
  ];
  const callback1039 = findNextFreeSlot(inesFixed, "ag-ines", new Date(now.getTime() + 20 * MIN), 15);
  const remote1036 = findNextFreeSlot(
    [...inesFixed, slot("tmp", "ag-ines", "callback", "", callback1039.start.toISOString(), callback1039.end.toISOString())],
    "ag-ines",
    new Date(now.getTime() + 90 * MIN),
    60,
  );

  const schedule: ScheduleItem[] = [
    // Inès Morel
    ...inesFixed,
    slot("s-ines-3", "ag-ines", "callback", "Rappel FP-1039", callback1039.start.toISOString(), callback1039.end.toISOString(), "t-1039"),
    slot("s-ines-4", "ag-ines", "remote", "Prise en main à distance — FP-1036", remote1036.start.toISOString(), remote1036.end.toISOString(), "t-1036"),
    // Support N1
    slot("s-thomas-1", "ag-thomas", "meeting", "Point d'équipe N1", at(9), at(9, 30)),
    slot("s-thomas-2", "ag-thomas", "remote", "Installation — FP-1051", at(14), at(15), "t-1051"),
    slot("s-sarah-1", "ag-sarah", "meeting", "Point d'équipe N1", at(9), at(9, 30)),
    slot("s-sarah-2", "ag-sarah", "remote", "Réenrôlement MFA — FP-1041", at(10, 30), at(11, 15), "t-1041"),
    slot("s-sarah-3", "ag-sarah", "break", "Pause déjeuner", at(12), at(13)),
    slot("s-lucas-1", "ag-lucas", "break", "Congé", at(8, 30), at(18)),
    slot("s-amina-1", "ag-amina", "meeting", "Point d'équipe N1", at(9), at(9, 30)),
    slot("s-amina-2", "ag-amina", "callback", "Rappel FP-1040", at(14, 30), at(14, 45), "t-1040"),
    // Systèmes & N2
    slot("s-julien-1", "ag-julien", "meeting", "Comité de changement", at(10), at(11)),
    slot("s-julien-2", "ag-julien", "remote", "Extension du partage RH — FP-1038", at(14), at(16), "t-1038"),
    slot("s-camille-1", "ag-camille", "remote", "Préparation migration — FP-1037", at(13, 30), at(15, 30), "t-1037"),
    slot("s-mehdi-1", "ag-mehdi", "meeting", "Revue sécurité mensuelle", at(11), at(12)),
    // Réseau & Télécom
    slot("s-nicolas-1", "ag-nicolas", "onsite", "Audit Wi-Fi — FP-1035", at(9, 30), at(11, 30), "t-1035", "4 rue du Port, Saint-Maur-des-Fossés"),
    slot("s-nicolas-2", "ag-nicolas", "remote", "Mise à jour pare-feu", at(15), at(16)),
    slot("s-lea-1", "ag-lea", "meeting", "Point fournisseur opérateur", at(14), at(14, 30)),
    slot("s-lea-2", "ag-lea", "remote", "Renvoi d'appels — FP-1034", at(10), at(11), "t-1034"),
    // Proximité
    slot("s-hugo-1", "ag-hugo", "onsite", "Imprimante 2e étage — FP-1043", at(10, 30), at(12), "t-1043", "3 place de l'Église, Choisy-le-Roi"),
    slot("s-hugo-2", "ag-hugo", "onsite", "Remplacement écran — FP-1033", at(14, 30), at(15, 30), "t-1033", "12 allée des Tilleuls, Créteil"),
    slot("s-chloe-1", "ag-chloe", "onsite", "Station d'accueil — FP-1032", at(9), at(10, 30), "t-1032", "41 rue de Paris, Montreuil"),
    slot("s-chloe-2", "ag-chloe", "onsite", "Livraison de postes", at(16), at(17)),
  ];
  // FP-1034 est planifié demain.
  schedule.find((s) => s.id === "s-lea-2")!.start = at(10, 0, 1);
  schedule.find((s) => s.id === "s-lea-2")!.end = at(11, 0, 1);

  const reminder = (
    id: string,
    agentId: string,
    ticketId: string,
    title: string,
    dueAt: string,
    createdBy: Reminder["createdBy"] = "automation",
  ): Reminder => ({ ...o, id, agentId, ticketId, title, dueAt, done: false, createdBy });

  const reminders: Reminder[] = [
    reminder("r-1031", "ag-ines", "t-1031", "Rappeler Aïssatou Traoré sur sa ligne directe — FP-1031", rel(-35), "agent"),
    reminder("r-1039", "ag-ines", "t-1039", "Rappeler Sophie Girard — FP-1039", callback1039.start.toISOString()),
    reminder("r-1048", "ag-ines", "t-1048", "Demander le logo en haute définition — FP-1048", at(9, 30, 1), "agent"),
    reminder("r-1040", "ag-amina", "t-1040", "Rappeler Paulo Fernandes — FP-1040", at(14, 30)),
  ];

  return {
    organization,
    teams,
    agents,
    companies,
    sites,
    requesters,
    tickets,
    events,
    reminders,
    schedule,
  };
}
