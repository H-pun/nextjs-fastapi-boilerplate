"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SlidersHorizontal } from "lucide-react";

const FilterRoot = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Popover>) => (
  <Popover {...props}>{children}</Popover>
);
FilterRoot.displayName = "Filter";

// Trigger button with badge
interface FilterTriggerProps
  extends React.ComponentPropsWithoutRef<typeof Button> {
  activeCount?: number;
}

const FilterTrigger = ({
  className,
  activeCount = 0,
  ...btnProps
}: FilterTriggerProps) => (
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      size="sm"
      className={cn("group inline-flex items-center gap-2", className)}
      {...btnProps}
    >
      <SlidersHorizontal className="h-4 w-4" />
      Filter
      {activeCount > 0 && (
        <Badge
          variant="secondary"
          className="rounded-full font-mono tabular-nums transition-colors group-hover:bg-primary/10"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  </PopoverTrigger>
);
FilterTrigger.displayName = "Filter.Trigger";

// Content wrapper
interface FilterContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  children: React.ReactNode;
}

const FilterContent = ({
  className,
  children,
  ...props
}: FilterContentProps) => (
  <PopoverContent align="end" className={cn("p-4", className)} {...props}>
    <div className="space-y-4">{children}</div>
  </PopoverContent>
);
FilterContent.displayName = "Filter.Content";

interface FilterActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  onReset?: () => void;
  onApply?: () => void;
}

const FilterActions = ({
  onReset,
  onApply,
  className,
  ...props
}: FilterActionsProps) => (
  <>
    <Separator />
    <div
      className={cn("flex items-center justify-end gap-2", className)}
      {...props}
    >
      <Button type="button" variant="ghost" size="sm" onClick={onReset}>
        Reset
      </Button>
      <Button type="button" variant="default" size="sm" onClick={onApply}>
        Apply
      </Button>
    </div>
  </>
);
FilterActions.displayName = "Filter.Actions";

export { FilterRoot as Filter, FilterTrigger, FilterContent, FilterActions };
