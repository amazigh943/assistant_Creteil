"use client";

import { CalendarRange, Inbox, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useStoreState } from "@/store/workspace-store";
import { AppSidebar } from "./app-sidebar";

/** Navigation compacte pour les petits écrans (la barre latérale est masquée). */
function MobileNav() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Aujourd'hui", icon: Sun, active: pathname === "/" },
    { href: "/tickets", label: "Tickets", icon: Inbox, active: pathname.startsWith("/tickets") },
    { href: "/planning", label: "Planning", icon: CalendarRange, active: pathname === "/planning" },
  ];
  return (
    <nav className="flex h-11 shrink-0 items-center gap-1 border-b bg-surface px-3 md:hidden">
      <LogoMark className="mr-2 size-5" />
      {links.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2 text-sm",
            active ? "bg-background font-medium shadow-[0_0_0_1px_var(--border)]" : "text-muted-foreground",
          )}
        >
          <Icon className="size-4" /> {label}
        </Link>
      ))}
    </nav>
  );
}

/** Squelette affiché pendant le rendu serveur et le chargement de l'état local. */
function ShellSkeleton() {
  return (
    <div className="flex h-dvh">
      <aside className="hidden w-60 shrink-0 border-r bg-surface md:block">
        <div className="flex h-12 items-center gap-2 px-4">
          <LogoMark />
          <div className="h-3 w-20 rounded bg-surface-strong" />
        </div>
        <div className="space-y-2 px-3 pt-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-7 rounded-md bg-surface-strong/70" />
          ))}
        </div>
      </aside>
      <main className="flex-1">
        <div className="h-12 border-b" />
        <div className="space-y-3 p-8">
          <div className="h-5 w-48 rounded bg-muted" />
          <div className="h-3 w-72 rounded bg-muted" />
        </div>
      </main>
    </div>
  );
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const state = useStoreState();
  if (!state) return <ShellSkeleton />;
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileNav />
        {children}
      </main>
    </div>
  );
}
