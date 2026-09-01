"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";

import { useQuery } from "@tanstack/react-query";

import { NavMain } from "@/components/nav-main";
import { NavSupport } from "@/components/nav-support";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getMyNavigation } from "@/lib/api/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const user = session?.user;

  // Keyed apart from the editor's ["navigation"]: this is the pruned menu for
  // one user, and saving the tree must not overwrite it with the full list.
  const { data, isLoading } = useQuery({
    queryKey: ["navigation", "me"],
    queryFn: getMyNavigation,
    enabled: !!user,
    staleTime: 1000 * 60 * 60,
  });

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-sidebar-border h-14 justify-center border-b p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-10 items-center gap-2.5 rounded-md px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg dark:bg-white">
                <Image
                  src="/images/logo.svg"
                  alt="App logo"
                  width={44}
                  height={44}
                  className="size-9 object-contain group-data-[collapsible=icon]:size-7"
                />
              </span>
              <span className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">Boilerplate</span>
                <span className="text-muted-foreground truncate text-xs">
                  Dashboard
                </span>
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <NavMain items={data} loading={isLoading || !user} />
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border gap-2 border-t p-2">
        <NavSupport />
        <div className="border-sidebar-border mt-1 border-t pt-2">
          <NavUser user={session?.user} />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
