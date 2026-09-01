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
import { getInitials } from "@/lib/utils";

import { BadgeCheck, LogOut, } from "lucide-react";

export function NavUser({
  user = {
    name: "Loading...",
    identifier: "...",
  },
}: {
  user?: {
    name: string;
    identifier: string;
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
          className="hover:bg-muted data-[state=open]:bg-muted flex max-w-52 cursor-pointer items-center gap-2 rounded-md p-1 transition-colors"
        >
          <span className="hidden min-w-0 text-right leading-tight sm:grid">
            <span className="truncate text-xs font-medium capitalize">
              {user.name.toLowerCase()}
            </span>
            <span className="text-muted-foreground truncate text-xs capitalize">
              {roleLabel}
            </span>
          </span>
          <Avatar className="size-7 rounded-md">
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
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 rounded-lg"
        side="bottom"
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
              <span className="truncate text-xs">{user.identifier}</span>
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            signOut({ redirect: false }).then(
              () => (window.location.href = "/")
            )
          }
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
