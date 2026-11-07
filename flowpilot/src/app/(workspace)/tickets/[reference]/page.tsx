import { Suspense } from "react";
import { TicketWorkspace } from "@/components/ticket/ticket-workspace";

async function TicketRoute({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  return <TicketWorkspace reference={reference} />;
}

export default function TicketPage({ params }: { params: Promise<{ reference: string }> }) {
  return (
    <Suspense>
      <TicketRoute params={params} />
    </Suspense>
  );
}
