import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AutoBreadcrumb } from "@/components/auto-breadcrumb";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    forbidden();
  }

  // No per-route check here. This layout is shared by every dashboard route,
  // and Partial Rendering keeps it mounted across client-side navigations —
  // so it runs with the pathname of whichever route mounted it first, not the
  // one being visited. Verified: navigating from /dashboard to an admin route
  // re-ran this with x-pathname=/dashboard, and the check silently passed.
  // Route-specific gates belong in the layout of the route they guard, where
  // the segment is structural rather than read from a header.

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex flex-1 justify-between px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-vertical:h-4 data-vertical:self-auto"
              />
              <AutoBreadcrumb />
            </div>
            <ThemeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
