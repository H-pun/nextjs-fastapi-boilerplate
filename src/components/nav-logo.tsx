"use client";

import Link from "next/link";
import Image from "next/image";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavLogo() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Link href="/">
            <div className="relative size-8 shrink-0">
              <Image
                src="/images/logo.png"
                alt="Logo"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Boilerplate</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
