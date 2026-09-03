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

/** Footer for infinite tables — loading spinner or end-of-list label. */
export function DataTableInfiniteFooter({
  infinite,
  className,
  ...props
}: DataTableInfiniteFooterProps) {
  if (infinite.isFetchingNextPage) {
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

  if (!infinite.hasNextPage && infinite.loadedCount > 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-2 text-muted-foreground text-sm",
          className
        )}
        {...props}
      >
        <span>End of list</span>
      </div>
    );
  }

  return null;
}
