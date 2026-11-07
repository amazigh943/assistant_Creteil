import { describe, expect, it } from "vitest";
import { createDemoWorkspace, CURRENT_AGENT_ID } from "@/data/demo";
import { findForeignEntities } from "@/organizations/tenant";
import { getAiServices } from "@/services/ai";
import { planAutomations } from "./automation/engine";
import { MAX_CALL_ATTEMPTS, pickAssignee } from "./automation/rules";
import type { EngineContext, InterventionInput, WorkspaceData } from "./domain/types";
import { commitIntervention, InterventionError, startWork } from "./intervention/commit";
import { findNextFreeSlot } from "./planning/slots";
import { agentQueue, nextTicketFor } from "./tickets/queries";

// Samedi ou non, peu importe : le prototype raisonne en heures ouvrées locales.
const NOW = new Date(2026, 10, 9, 10, 40, 0); // lundi 9 novembre 2026, 10:40

function makeCtx(now = NOW): EngineContext {
  let n = 0;
  return { now, newId: (p) => `${p}-test-${++n}` };
}

function fresh(): WorkspaceData {
  return createDemoWorkspace(NOW);
}

function input(partial: Partial<InterventionInput> & Pick<InterventionInput, "ticketId" | "outcome">): InterventionInput {
  return { agentId: CURRENT_AGENT_ID, quickActionIds: [], note: "", callDurationSec: 0, ...partial };
}

function draft(data: WorkspaceData, i: InterventionInput) {
  const ticket = data.tickets.find((t) => t.id === i.ticketId)!;
  return getAiServices().reportComposer.compose({ ticket, input: i, now: NOW });
}

describe("données de démonstration", () => {
  it("contient une organisation de 12 agents, cohérente", () => {
    const data = fresh();
    expect(data.agents).toHaveLength(12);
    expect(findForeignEntities(data)).toEqual([]);
    for (const t of data.tickets) {
      expect(data.requesters.some((r) => r.id === t.requesterId)).toBe(true);
      expect(data.teams.some((team) => team.id === t.teamId)).toBe(true);
    }
    expect(new Set(data.tickets.map((t) => t.reference)).size).toBe(data.tickets.length);
  });

  it("classe la file de l'agent par urgence : le critique imminent, puis le SLA dépassé", () => {
    const queue = agentQueue(fresh(), CURRENT_AGENT_ID, NOW);
    expect(queue[0].ticket.reference).toBe("FP-1042"); // critique, VIP, SLA imminent
    expect(queue[1].ticket.reference).toBe("FP-1031"); // haute, SLA dépassé
    const tail = queue.slice(-2).map((r) => r.ticket.status);
    expect(tail.every((s) => s === "waiting" || s === "scheduled")).toBe(true);
  });
});

describe("planning", () => {
  it.each([NOW, new Date(2026, 10, 9, 15, 25)])("place les créneaux de démo dans les heures ouvrées (%s)", (now) => {
    const data = createDemoWorkspace(now);
    for (const item of data.schedule.filter((s) => s.agentId === CURRENT_AGENT_ID)) {
      const start = new Date(item.start);
      const end = new Date(item.end);
      expect(start.getHours() * 60 + start.getMinutes()).toBeGreaterThanOrEqual(8 * 60 + 30);
      expect(end.getHours() * 60 + end.getMinutes()).toBeLessThanOrEqual(18 * 60);
    }
  });

  it("trouve le prochain créneau libre en évitant les chevauchements et la pause", () => {
    const data = fresh();
    const from = new Date(2026, 10, 9, 12, 20);
    const slot = findNextFreeSlot(data.schedule, CURRENT_AGENT_ID, from, 30);
    // 12:30–13:30 est la pause déjeuner : le créneau doit commencer à 13:30 au plus tôt.
    expect(slot.start.getHours() * 60 + slot.start.getMinutes()).toBeGreaterThanOrEqual(13 * 60 + 30);
  });

  it("reporte au lendemain matin après la fin de journée", () => {
    const slot = findNextFreeSlot([], CURRENT_AGENT_ID, new Date(2026, 10, 9, 17, 50), 30);
    expect(slot.start.getDate()).toBe(10);
    expect(slot.start.getHours()).toBe(8);
    expect(slot.start.getMinutes()).toBe(30);
  });
});

describe("moteur d'automatisation", () => {
  it("résolution : statut résolu, rappels clôturés, créneau libéré, e-mail préparé", () => {
    const data = fresh();
    const i = input({ ticketId: "t-1039", outcome: "resolved", quickActionIds: ["ost-rebuild"] });
    const { data: next, plan } = commitIntervention(data, i, draft(data, i), makeCtx());
    const ticket = next.tickets.find((t) => t.id === "t-1039")!;
    expect(ticket.status).toBe("resolved");
    expect(ticket.resolvedAt).not.toBeNull();
    expect(next.reminders.find((r) => r.id === "r-1039")!.done).toBe(true);
    expect(next.schedule.some((s) => s.ticketId === "t-1039")).toBe(false);
    expect(plan.steps.map((s) => s.kind)).toEqual(
      expect.arrayContaining(["status", "notification", "reminder", "planning"]),
    );
    expect(next.events.filter((e) => e.ticketId === "t-1039" && e.kind === "report")).toHaveLength(2);
  });

  it("aucune réponse : tentative incrémentée, rappel et créneau ajoutés au prochain créneau libre", () => {
    const data = fresh();
    const i = input({ ticketId: "t-1045", outcome: "no_answer", quickActionIds: ["voicemail"] });
    const { data: next } = commitIntervention(data, i, draft(data, i), makeCtx());
    const ticket = next.tickets.find((t) => t.id === "t-1045")!;
    expect(ticket.status).toBe("waiting");
    expect(ticket.callAttempts).toBe(1);
    const reminder = next.reminders.find((r) => r.ticketId === "t-1045" && !r.done)!;
    expect(new Date(reminder.dueAt).getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 2 * 3600_000);
    const slot = next.schedule.find((s) => s.ticketId === "t-1045")!;
    expect(slot.kind).toBe("callback");
    expect(slot.start).toBe(reminder.dueAt);
  });

  it(`aucune réponse à la ${MAX_CALL_ATTEMPTS}e tentative : clôture proposée, pas de nouveau créneau`, () => {
    const data = fresh(); // FP-1031 a déjà 2 tentatives
    const i = input({ ticketId: "t-1031", outcome: "no_answer" });
    const { data: next } = commitIntervention(data, i, draft(data, i), makeCtx());
    expect(next.tickets.find((t) => t.id === "t-1031")!.callAttempts).toBe(3);
    expect(next.reminders.some((r) => r.ticketId === "t-1031" && !r.done && r.title.startsWith("Clôturer"))).toBe(true);
    expect(next.schedule.some((s) => s.ticketId === "t-1031")).toBe(false);
  });

  it("à poursuivre : ticket planifié et créneau ajouté au planning de l'agent", () => {
    const data = fresh();
    const start = new Date(2026, 10, 10, 9, 0).toISOString();
    const i = input({
      ticketId: "t-1044",
      outcome: "follow_up",
      followUp: { mode: "remote", start, durationMin: 30 },
    });
    const { data: next } = commitIntervention(data, i, draft(data, i), makeCtx());
    expect(next.tickets.find((t) => t.id === "t-1044")!.status).toBe("scheduled");
    const slot = next.schedule.find((s) => s.ticketId === "t-1044")!;
    expect(slot).toMatchObject({ agentId: CURRENT_AGENT_ID, kind: "remote", start });
  });

  it("transfert : attribution à l'agent disponible le moins chargé de l'équipe cible", () => {
    const data = fresh();
    const expected = pickAssignee({ data }, "team-net")!;
    expect(expected.presence).not.toBe("offline");
    const i = input({ ticketId: "t-1047", outcome: "transfer", transfer: { teamId: "team-net", reasonIds: ["out-of-scope"] } });
    const { data: next } = commitIntervention(data, i, draft(data, i), makeCtx());
    const ticket = next.tickets.find((t) => t.id === "t-1047")!;
    expect(ticket).toMatchObject({ teamId: "team-net", assigneeId: expected.id, status: "open" });
    expect(agentQueue(next, CURRENT_AGENT_ID, NOW).some((r) => r.ticket.id === "t-1047")).toBe(false);
  });

  it("n'attribue jamais un agent hors ligne", () => {
    const data = fresh();
    const n1 = pickAssignee({ data }, "team-n1")!;
    expect(n1.id).not.toBe("ag-lucas");
  });

  it("refuse une intervention invalide", () => {
    const data = fresh();
    const i = input({ ticketId: "t-1047", outcome: "transfer", transfer: { teamId: "team-n1", reasonIds: [] } });
    expect(() => commitIntervention(data, i, draft(data, i), makeCtx())).toThrow(InterventionError);
    const resolved = input({ ticketId: "t-1026", outcome: "resolved" });
    expect(() => commitIntervention(data, resolved, draft(data, resolved), makeCtx())).toThrow(InterventionError);
  });

  it("le plan prévisualisé est exactement celui qui est appliqué", () => {
    const data = fresh();
    const ctx = makeCtx();
    const i = input({ ticketId: "t-1045", outcome: "no_answer" });
    const plan = planAutomations(data, i, ctx);
    const { plan: applied } = commitIntervention(data, i, draft(data, i), ctx, plan);
    expect(applied).toBe(plan);
  });

  it("prise en charge : passage en cours et attribution d'un ticket non attribué", () => {
    const next = startWork(fresh(), "t-1050", CURRENT_AGENT_ID, makeCtx());
    expect(next.tickets.find((t) => t.id === "t-1050")).toMatchObject({
      status: "in_progress",
      assigneeId: CURRENT_AGENT_ID,
    });
  });

  it("ticket suivant : ignore le ticket courant et ceux en attente", () => {
    const data = fresh();
    const next = nextTicketFor(data, CURRENT_AGENT_ID, NOW, "t-1042");
    expect(next?.reference).toBe("FP-1031");
  });
});

describe("services IA simulés", () => {
  it("compte rendu déterministe : mêmes entrées, même sortie", () => {
    const data = fresh();
    const ticket = data.tickets.find((t) => t.id === "t-1045")!;
    const i = input({ ticketId: ticket.id, outcome: "resolved", quickActionIds: ["pwd-reset"], note: "pb reglé, mdp maj sur le tel", callDurationSec: 245 });
    const { reportComposer } = getAiServices();
    const a = reportComposer.compose({ ticket, input: i, now: NOW });
    const b = reportComposer.compose({ ticket, input: i, now: NOW });
    expect(a).toEqual(b);
    expect(a.durationMin).toBe(5);
    expect(a.actions).toContain("Réinitialisation du mot de passe et déverrouillage du compte.");
    expect(a.result).toContain("Problème reglé, mot de passe maj sur le téléphone.");
  });

  it("assistant : propose l'article VPN et l'équipe Réseau pour un ticket VPN", () => {
    const data = fresh();
    const ticket = data.tickets.find((t) => t.id === "t-1047")!;
    const insight = getAiServices().assistant.analyzeTicket({ ticket, data });
    expect(insight.mode).toBe("simulated");
    expect(insight.suggestions[0].articleRef).toBe("KB-0305");
    expect(insight.classification.teamId).toBe("team-net");
  });

  it("assistant : ne surclasse pas un incident individuel en critique", () => {
    const data = fresh();
    for (const id of ["t-1045", "t-1036"]) {
      const ticket = data.tickets.find((t) => t.id === id)!;
      const { classification } = getAiServices().assistant.analyzeTicket({ ticket, data });
      expect(classification.priority).not.toBe("critical");
    }
    const outage = data.tickets.find((t) => t.id === "t-1042")!;
    expect(getAiServices().assistant.analyzeTicket({ ticket: outage, data }).classification.priority).toBe("critical");
  });

  it("assistant : retrouve un ticket similaire résolu", () => {
    const data = fresh();
    const ticket = data.tickets.find((t) => t.id === "t-1042")!;
    const insight = getAiServices().assistant.analyzeTicket({ ticket, data });
    expect(insight.similar[0]?.reference).toBe("FP-1026");
    expect(insight.suggestions[0].articleRef).toBe("KB-0611");
  });
});
