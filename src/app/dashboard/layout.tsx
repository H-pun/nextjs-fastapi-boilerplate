import { headers } from "next/headers";
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
