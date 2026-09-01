import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
        <DashboardHeader />
        <main className="flex-1 px-6 pt-7 pb-14">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
