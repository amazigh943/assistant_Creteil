"use client";

import { Building2, Copy, Mail, MapPin, Phone, PhoneOff, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { Ticket } from "@/core/domain/types";
import type { TicketContext } from "@/core/tickets/queries";
import { formatDuration } from "@/lib/time";
import { cn, telHref } from "@/lib/utils";
import { actions, useCallElapsed, useStore } from "@/store/workspace-store";

export function CallButton({ ticket }: { ticket: Ticket }) {
  const call = useCallElapsed();
  const { data, callDurations } = useStore();
  const onThis = call?.ticketId === ticket.id;
  const elsewhere = call && !onThis ? data.tickets.find((t) => t.id === call.ticketId) : undefined;
  const recorded = callDurations[ticket.id];

  if (ticket.status === "resolved") return null;

  if (onThis) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex h-8 items-center gap-2 rounded-md bg-[color-mix(in_oklch,var(--s-progress)_14%,white)] px-2.5 text-sm font-medium">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-s-progress opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-s-progress" />
          </span>
          En appel <span className="tabular">{formatDuration(call.seconds)}</span>
        </span>
        <Button variant="outline" onClick={() => actions.endCall()}>
          <PhoneOff className="text-destructive" /> Raccrocher
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {recorded && (
        <span className="text-xs text-muted-foreground tabular" title="Durée d'appel enregistrée pour le compte rendu">
          Appel : {formatDuration(recorded)}
        </span>
      )}
      <Button
        variant="flow"
        disabled={Boolean(elsewhere)}
        onClick={() => actions.startCall(ticket.id)}
        title={elsewhere ? `Appel en cours sur ${elsewhere.reference}` : undefined}
      >
        <Phone /> {recorded ? "Rappeler" : "Appeler"} <Kbd className="border-white/30">C</Kbd>
      </Button>
    </div>
  );
}

export function RequesterCard({ ctx }: { ctx: TicketContext }) {
  const { requester, company, site, ticket } = ctx;
  if (!requester) return null;
  const copy = (value: string, label: string) => {
    navigator.clipboard?.writeText(value).then(
      () => toast(`${label} copié`),
      () => undefined,
    );
  };
  return (
    <section className="rounded-xl border bg-background shadow-xs">
      <div className="flex flex-wrap items-start gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
              {requester.firstName} {requester.lastName}
            </h2>
            {requester.vip && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-warning-soft px-1.5 py-px text-[11px] font-medium text-[oklch(0.5_0.12_60)]">
                <Star className="size-3 fill-current" /> VIP
              </span>
            )}
          </div>
          <p className="text-muted-foreground">{requester.jobTitle}</p>
        </div>
        <CallButton ticket={ticket} />
      </div>
      <dl className="grid gap-px border-t bg-border text-sm sm:grid-cols-2">
        {[
          {
            icon: Building2,
            label: "Entreprise",
            value: company?.name,
            sub: company?.sector,
          },
          {
            icon: MapPin,
            label: "Établissement",
            value: site ? `${site.name} — ${site.city}` : undefined,
            sub: site?.address,
          },
          {
            icon: Phone,
            label: "Téléphone",
            value: requester.phone,
            href: telHref(requester.phone),
            copy: true,
          },
          {
            icon: Mail,
            label: "E-mail",
            value: requester.email,
            href: `mailto:${requester.email}`,
            copy: true,
          },
        ].map((row) => (
          <div key={row.label} className="group flex items-start gap-2.5 bg-background px-4 py-2.5">
            <row.icon className="mt-0.5 size-3.5 shrink-0 text-subtle" />
            <div className="min-w-0 flex-1">
              <dt className="text-[11px] text-subtle">{row.label}</dt>
              <dd className={cn("truncate", row.label === "Téléphone" && "tabular")}>
                {row.href ? (
                  <a href={row.href} className="hover:underline hover:underline-offset-2">
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
                {row.sub && <span className="block truncate text-xs text-muted-foreground">{row.sub}</span>}
              </dd>
            </div>
            {row.copy && row.value && (
              <button
                onClick={() => copy(row.value!, row.label)}
                className="mt-3 text-subtle opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                aria-label={`Copier ${row.label.toLowerCase()}`}
              >
                <Copy className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
