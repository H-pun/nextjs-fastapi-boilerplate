import { AutoBreadcrumb } from "@/components/auto-breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";

/** Shared sticky header for every authenticated dashboard page. */
export function DashboardHeader() {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-20 flex h-14 flex-none items-center gap-3 border-b px-6 backdrop-blur-md">
      <SidebarTrigger className="text-muted-foreground -ml-1" />
      <div className="text-muted-foreground flex min-w-0 flex-1 items-center text-sm">
        <AutoBreadcrumb />
      </div>
    </header>
  );
}
