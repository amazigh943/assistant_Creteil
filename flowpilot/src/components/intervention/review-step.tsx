"use client";

import { ArrowLeft, FileText, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Textarea } from "@/components/ui/textarea";
import type { AutomationPlan } from "@/core/automation/types";
import type { InterventionReport } from "@/core/domain/types";
import { AutomationSteps } from "./automation-steps";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 md:grid-cols-[120px_1fr] md:gap-4">
      <span className="pt-1.5 text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function ReviewStep({
  report,
  setReport,
  plan,
  onBack,
  onConfirm,
}: {
  report: InterventionReport;
  setReport: (r: InterventionReport) => void;
  plan: AutomationPlan;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const edit = <K extends keyof InterventionReport>(key: K, value: InterventionReport[K]) =>
    setReport({ ...report, [key]: value, editedByAgent: true });

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-subtle" />
          <span className="font-medium">Compte rendu</span>
          <Badge variant="muted" className="ml-1">
            {report.editedByAgent ? "Modifié par vous" : "Brouillon généré"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Préparé à partir de vos sélections par un modèle de texte déterministe — aucune IA n&apos;est connectée.
          Relisez et corrigez avant d&apos;enregistrer.
        </p>
        <div className="space-y-3 pt-1">
          <Row label="Résumé">
            <Input value={report.summary} onChange={(e) => edit("summary", e.target.value)} />
          </Row>
          <Row label="Contexte">
            <Textarea value={report.context} onChange={(e) => edit("context", e.target.value)} className="min-h-14" />
          </Row>
          <Row label="Actions réalisées">
            <Textarea
              value={report.actions.join("\n")}
              onChange={(e) => edit("actions", e.target.value.split("\n"))}
              placeholder="Une action par ligne"
              className="min-h-14"
            />
          </Row>
          <Row label="Résultat">
            <Textarea value={report.result} onChange={(e) => edit("result", e.target.value)} className="min-h-14" />
          </Row>
          <Row label="Prochaine étape">
            <Textarea value={report.nextStep} onChange={(e) => edit("nextStep", e.target.value)} className="min-h-10" />
          </Row>
          <Row label="Durée (min)">
            <Input
              type="number"
              min={0}
              value={report.durationMin}
              onChange={(e) => edit("durationMin", Math.max(0, Number(e.target.value) || 0))}
              className="w-24"
            />
          </Row>
        </div>
      </div>

      <aside className="space-y-2 rounded-lg border bg-surface p-3">
        <div className="flex items-center gap-1.5 px-2 text-xs font-medium">
          <Zap className="size-3.5 text-flow" /> À la validation, FlowPilot va :
        </div>
        <AutomationSteps steps={plan.steps} />
      </aside>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft /> Modifier la saisie
        </Button>
        <Button variant="flow" onClick={onConfirm}>
          Valider et enregistrer <Kbd className="ml-1 border-white/30">⌘↵</Kbd>
        </Button>
      </div>
    </div>
  );
}
