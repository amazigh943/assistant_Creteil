import type {
  EngineContext,
  Id,
  InterventionInput,
  Reminder,
  ScheduleItem,
  Ticket,
  WorkspaceData,
} from "../domain/types";

/** Effet atomique produit par une règle. Les effets sont sérialisables. */
export type AutomationEffect =
  | {
      type: "ticket.update";
      ticketId: Id;
      patch: Partial<
        Pick<Ticket, "status" | "assigneeId" | "teamId" | "callAttempts" | "resolvedAt">
      >;
    }
  | { type: "reminder.create"; reminder: Reminder }
  | { type: "reminder.complete"; reminderIds: Id[] }
  | { type: "schedule.add"; item: ScheduleItem }
  | { type: "schedule.remove"; itemIds: Id[] }
  | {
      type: "notification.prepare";
      ticketId: Id;
      channel: "email" | "in_app";
      to: string;
      subject: string;
      body: string;
    };

export type AutomationStepKind = "status" | "assignment" | "reminder" | "planning" | "notification";

/** Étape lisible d'un plan : ce que l'agent voit avant de valider. */
export interface AutomationStep {
  ruleId: string;
  kind: AutomationStepKind;
  title: string;
  detail?: string;
  effects: AutomationEffect[];
}

export interface AutomationPlan {
  ticketId: Id;
  outcome: InterventionInput["outcome"];
  steps: AutomationStep[];
}

export interface RuleContext extends EngineContext {
  data: WorkspaceData;
  input: InterventionInput;
  ticket: Ticket;
}

/** Une règle déclarative : elle observe le contexte et propose des étapes. */
export interface AutomationRule {
  id: string;
  description: string;
  appliesTo: InterventionInput["outcome"][];
  plan: (ctx: RuleContext) => AutomationStep[];
}
