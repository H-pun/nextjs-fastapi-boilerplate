"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { REVEAL } from "./tree-row-style";

/**
 * Reorder controls for a tree row. A bare chevron reads just as easily as
 * collapse/expand, so each one says what it does on hover; the aria-label stays
 * specific for screen readers, where a repeated "Move up" would be useless.
 *
 * The global TooltipProvider opens with no delay, which is too eager for a
 * control that appears under the cursor as you sweep down the list.
 */
export function MoveButtons({
  label,
  disabled,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: {
  label: string;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Move ${label} up`}
            disabled={disabled || !canMoveUp}
            className={cn(REVEAL, "text-muted-foreground")}
            onClick={onMoveUp}
          >
            <ChevronUp />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Move up</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={400}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Move ${label} down`}
            disabled={disabled || !canMoveDown}
            className={cn(REVEAL, "text-muted-foreground")}
            onClick={onMoveDown}
          >
            <ChevronDown />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Move down</TooltipContent>
      </Tooltip>
    </div>
  );
}
