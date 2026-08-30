"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { NavLogo } from "@/components/nav-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getNavigation } from "@/lib/api/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { data: navigation, isFetching: navigationLoading } = useQuery({
    queryKey: ["navigation", session?.user?.role?.id],
    queryFn: () => getNavigation(session!.user.role.id),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    enabled: !!session?.user?.role?.id,
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigation} loading={navigationLoading} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session?.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
