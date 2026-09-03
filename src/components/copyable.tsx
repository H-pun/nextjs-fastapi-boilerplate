"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOAST_VALUE_MAX = 48;

interface CopyableProps {
  /** String written to the clipboard. */
  value: string;
  /** What the cell shows. */
  children: React.ReactNode;
  className?: string;
}

function formatCopiedToast(value: string) {
  if (value.length <= TOAST_VALUE_MAX) return `Copied “${value}”`;
  return `Copied “${value.slice(0, TOAST_VALUE_MAX)}…”`;
}

export function Copyable({ value, children, className }: CopyableProps) {
  const onCopy = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    try {
      await navigator.clipboard.writeText(value);
      toast.success(formatCopiedToast(value));
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <span
      className={cn(
        "group/copyable inline-flex max-w-full items-center gap-1",
        className
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Copy"
        className={cn(
          "text-muted-foreground opacity-0 transition-opacity delay-0 duration-150",
          // Delay only on show; leave instantly when the pointer leaves.
          "group-hover/copyable:opacity-100 group-hover/copyable:delay-300",
          "focus-visible:opacity-100 focus-visible:delay-0"
        )}
        onClick={onCopy}
      >
        <Copy />
      </Button>
    </span>
  );
}
