import { cn } from "@/lib/utils";

export function PageHeader({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex h-12 shrink-0 items-center gap-3 border-b px-6", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
