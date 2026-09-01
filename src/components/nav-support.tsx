"use client";

import Link from "next/link";
import {
  BookOpen,
  LifeBuoy,
  Mail,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavSupport() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip="Help & support"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <LifeBuoy />
              <span>Help &amp; support</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="min-w-56 rounded-lg"
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Helpdesk & Resources
            </DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <a href="mailto:support@example.com">
                <Mail className="mr-2 h-4 w-4" />
                support@example.com
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/admin/docs">
                <BookOpen className="mr-2 h-4 w-4" />
                API Documentation
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
