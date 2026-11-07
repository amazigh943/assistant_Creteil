import type { Metadata } from "next";
import { Suspense } from "react";
import { TicketsView } from "@/components/tickets/tickets-view";

export const metadata: Metadata = { title: "Tickets" };

export default function TicketsPage() {
  return (
    <Suspense>
      <TicketsView />
    </Suspense>
  );
}
