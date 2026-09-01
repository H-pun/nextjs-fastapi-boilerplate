import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Back = {
  /** Where it goes, named for the tooltip: "Master Data", "All projects". */
  label: string;
  href?: string;
  /** For a page that must intercept the leave, e.g. an unsaved form. */
  onClick?: () => void;
};

/**
 * Title and description that open a dashboard page.
 *
 * Every page had been repeating the same markup, so the heading style had to
 * be changed in seventeen places at once. Pass `action` for a control that
 * sits on the same line, right-aligned on wider screens, and `back` for the
 * way out to the parent page.
 */
export function PageHeader({
  title,
  description,
  action,
  back,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  back?: Back;
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
        <h1
          className={cn(
            "mb-1.5 text-[26px] font-semibold tracking-[-0.025em]",
            back && "flex items-center gap-2"
          )}
        >
          {back && <BackArrow {...back} />}
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

/**
 * The way back, on the title line rather than floating above it: it belongs to
 * the heading, and a line of its own pushes the page down by 24px to say one
 * word. An arrow alone names nothing, so the destination is the tooltip.
 */
function BackArrow({ label, href, onClick }: Back) {
  const className =
    "text-muted-foreground hover:text-foreground -ml-1 shrink-0 cursor-pointer";

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        {href ? (
          <Link href={href} aria-label={`Back to ${label}`} className={className}>
            <ArrowLeft className="size-6" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            aria-label={`Back to ${label}`}
            className={className}
          >
            <ArrowLeft className="size-6" />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
