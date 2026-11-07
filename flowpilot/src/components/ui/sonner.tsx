"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-popover !text-popover-foreground !shadow-lg !text-sm !gap-2 !py-3",
          description: "!text-muted-foreground !text-xs",
          actionButton: "!bg-primary !text-primary-foreground !rounded-md !text-xs",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
