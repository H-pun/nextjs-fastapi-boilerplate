import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Title and description that open a dashboard page.
 *
 * Every page had been repeating the same markup, so the heading style had to
 * be changed in seventeen places at once. Pass `action` for a control that
 * sits on the same line, right-aligned on wider screens.
 */
export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5",
        action &&
          "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h1 className="mb-1.5 text-[26px] font-semibold tracking-[-0.025em]">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
