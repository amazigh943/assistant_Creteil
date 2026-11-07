import * as React from "react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-4.5 min-w-4.5 select-none items-center justify-center rounded-[4px] border border-current/15 px-1 font-sans text-[10px] font-medium opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
