"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeMenuItems } from "@/components/theme-menu-items";
import { getInitials } from "@/lib/utils";

import { BadgeCheck, ChevronsUpDown, LogOut, Palette } from "lucide-react";

export function NavUser({
  user = {
    name: "Loading...",
    email: "…",
  },
}: {
  user?: {
    name: string;
    email?: string;
    roles?: { name: string }[];
    avatar?: string;
  };
}) {
  // A user may hold several roles; the strip under their name lists them all.
  const roleLabel = user.roles?.map((r) => r.name).join(", ") || "…";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-left transition-colors"
        >
          <Avatar className="size-8 rounded-md">
            {user.avatar && (
              <AvatarImage
                src={`/api/server/preview?filename=${user.avatar}`}
                alt={user.name}
              />
            )}
            <AvatarFallback className="rounded-md text-xs">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="grid min-w-0 flex-1 leading-tight">
            <span className="truncate text-xs font-medium capitalize">
              {user.name.toLowerCase()}
            </span>
            <span className="text-muted-foreground truncate text-xs capitalize">
              {roleLabel}
            </span>
          </span>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="top"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-foreground p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg">
              {user.avatar && (
                <AvatarImage
                  src={`/api/server/preview?filename=${user.avatar}`}
                  alt={user.name}
                />
              )}
              <AvatarFallback className="rounded-lg">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold capitalize">
                {user.name.toLowerCase()}
              </span>
              {/* The one thing every account has, and what they sign in with
                  when they have not picked a username. */}
              <span className="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/profile`}>
              <BadgeCheck className="mr-2 h-4 w-4" />
              Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette />
              Theme
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <ThemeMenuItems />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
