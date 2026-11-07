import type { Metadata } from "next";
import { TeamPlanning } from "@/components/planning/team-planning";

export const metadata: Metadata = { title: "Planning" };

export default function PlanningPage() {
  return <TeamPlanning />;
}
