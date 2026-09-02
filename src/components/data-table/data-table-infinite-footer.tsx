"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface DataTableInfiniteState {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  totalItems: number;
  loadedCount: number;
}

interface DataTableInfiniteFooterProps extends React.ComponentProps<"div"> {
  infinite: DataTableInfiniteState;
}

/** Minimal footer — only visible while the next chunk is loading. */
export function DataTableInfiniteFooter({
  infinite,
  className,
  ...props
}: DataTableInfiniteFooterProps) {
  if (!infinite.isFetchingNextPage) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 p-2 text-muted-foreground text-sm",
        className
      )}
      {...props}
    >
      <Spinner />
      <span>Loading more…</span>
    </div>
  );
}
