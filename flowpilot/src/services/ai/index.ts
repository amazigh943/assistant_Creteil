import { simulatedAssistant } from "./simulated/assistant";
import { templateReportComposer } from "./simulated/report-composer";
import type { AssistantProvider, ReportComposer } from "./types";

export interface AiServices {
  assistant: AssistantProvider;
  reportComposer: ReportComposer;
}

/**
 * Point d'entrée unique des services IA.
 * Le prototype n'utilise que des implémentations simulées et déterministes.
 */
export function getAiServices(): AiServices {
  return { assistant: simulatedAssistant, reportComposer: templateReportComposer };
}

export type * from "./types";
