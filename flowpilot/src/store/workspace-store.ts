"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { planAutomations } from "@/core/automation/engine";
import type { AutomationPlan } from "@/core/automation/types";
import type {
  EngineContext,
  Id,
  InterventionInput,
  InterventionReport,
  Ticket,
  WorkspaceData,
} from "@/core/domain/types";
import { commitIntervention as commit, setReminderDone, startWork } from "@/core/intervention/commit";
import { reclassifyTicket } from "@/core/tickets/commands";
import { createDemoWorkspace, CURRENT_AGENT_ID } from "@/data/demo";

/**
 * État client du prototype.
 *
 * Tout est conservé dans le navigateur (localStorage). Les mutations passent
 * exclusivement par les fonctions du moteur métier (`src/core`), comme le
 * ferait plus tard une API serveur.
 */
export interface StoreState {
  version: number;
  /** Décalage entre l'horloge de démonstration et l'horloge réelle. */
  clockOffsetMs: number;
  seededOn: string;
  currentAgentId: Id;
  data: WorkspaceData;
  activeCall: { ticketId: Id; startedAtReal: number } | null;
  /** Durée du dernier appel chronométré, par ticket, en attente de compte rendu. */
  callDurations: Record<Id, number>;
}

const STORAGE_KEY = "flowpilot.demo";
const VERSION = 3;

let state: StoreState | null = null;
const listeners = new Set<() => void>();

/* ------------------------------------------------------------------ */
/* Horloge de démonstration                                            */
/* ------------------------------------------------------------------ */

/**
 * Hors de la plage 08:30–15:30, la démo démarre sur une horloge fixée à 10:40
 * pour que le planning du jour reste cohérent. L'interface l'indique.
 */
function demoClockOffset(real: Date): number {
  const minutes = real.getHours() * 60 + real.getMinutes();
  if (minutes >= 8 * 60 + 30 && minutes <= 15 * 60 + 30) return 0;
  const demo = new Date(real);
  demo.setHours(10, 40, 0, 0);
  return demo.getTime() - real.getTime();
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function seed(): StoreState {
  const real = new Date();
  const clockOffsetMs = demoClockOffset(real);
  const now = new Date(real.getTime() + clockOffsetMs);
  return {
    version: VERSION,
    clockOffsetMs,
    seededOn: dayKey(now),
    currentAgentId: CURRENT_AGENT_ID,
    data: createDemoWorkspace(now),
    activeCall: null,
    callDurations: {},
  };
}

function load(): StoreState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoreState;
    if (parsed.version !== VERSION) return null;
    // Nouvelle journée : on repart d'un jeu de données frais.
    if (parsed.seededOn !== dayKey(new Date(Date.now() + parsed.clockOffsetMs))) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(s: StoreState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Stockage indisponible (navigation privée) : la démo fonctionne en mémoire.
  }
}

function ensure(): StoreState {
  if (!state) {
    state = load() ?? seed();
    persist(state);
  }
  return state;
}

function set(updater: (s: StoreState) => StoreState) {
  state = updater(ensure());
  persist(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function demoNow(): Date {
  return new Date(Date.now() + ensure().clockOffsetMs);
}

function ctx(): EngineContext {
  return {
    now: demoNow(),
    newId: (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`,
  };
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** `null` pendant le rendu serveur et l'hydratation, puis l'état client. */
export function useStoreState(): StoreState | null {
  return useSyncExternalStore(subscribe, ensure, () => null);
}

export function useStore(): StoreState {
  const s = useStoreState();
  if (!s) throw new Error("useStore doit être utilisé sous <WorkspaceGate>.");
  return s;
}

/** Heure de démonstration, rafraîchie à intervalle régulier. */
export function useNow(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => demoNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(demoNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export const actions = {
  startCall(ticketId: Id) {
    set((s) => ({
      ...s,
      activeCall: { ticketId, startedAtReal: Date.now() },
      data: startWork(s.data, ticketId, s.currentAgentId, ctx()),
    }));
  },

  endCall() {
    set((s) => {
      if (!s.activeCall) return s;
      const sec = Math.max(1, Math.round((Date.now() - s.activeCall.startedAtReal) / 1000));
      const id = s.activeCall.ticketId;
      return {
        ...s,
        activeCall: null,
        callDurations: { ...s.callDurations, [id]: (s.callDurations[id] ?? 0) + sec },
      };
    });
  },

  startWork(ticketId: Id) {
    set((s) => ({ ...s, data: startWork(s.data, ticketId, s.currentAgentId, ctx()) }));
  },

  previewAutomations(input: InterventionInput): AutomationPlan {
    return planAutomations(ensure().data, input, ctx());
  },

  commitIntervention(input: InterventionInput, report: InterventionReport, plan: AutomationPlan) {
    const s = ensure();
    const result = commit(s.data, input, report, ctx(), plan);
    const callDurations = { ...s.callDurations };
    delete callDurations[input.ticketId];
    set((prev) => ({
      ...prev,
      data: result.data,
      callDurations,
      activeCall: prev.activeCall?.ticketId === input.ticketId ? null : prev.activeCall,
    }));
    return result;
  },

  setReminderDone(reminderId: Id, done: boolean) {
    set((s) => ({ ...s, data: setReminderDone(s.data, reminderId, done) }));
  },

  reclassify(ticketId: Id, patch: Partial<Pick<Ticket, "category" | "priority">>) {
    set((s) => ({
      ...s,
      data: reclassifyTicket(s.data, ticketId, patch, s.currentAgentId, ctx(), "assistant"),
    }));
  },

  switchAgent(agentId: Id) {
    set((s) => ({ ...s, currentAgentId: agentId, activeCall: null }));
  },

  resetDemo() {
    state = seed();
    persist(state);
    listeners.forEach((l) => l());
  },
};

/** Durée de l'appel en cours, en secondes (null si aucun appel). */
export function useCallElapsed(): { ticketId: Id; seconds: number } | null {
  const s = useStore();
  const now = useNow(1000);
  if (!s.activeCall) return null;
  return {
    ticketId: s.activeCall.ticketId,
    seconds: Math.max(0, Math.round((now.getTime() - s.clockOffsetMs - s.activeCall.startedAtReal) / 1000)),
  };
}

/** Lecture synchrone de l'état courant (gestionnaires d'événements). */
export const getStoreState = (): StoreState => ensure();
