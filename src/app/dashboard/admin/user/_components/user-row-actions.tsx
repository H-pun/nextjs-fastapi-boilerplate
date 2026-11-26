"use client";

import { Ellipsis } from "lucide-react";

import type { UserData } from "@/lib/types/user";
import { Button } from "@/components/ui/button";
import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UserRowActionsConfig {
  onEdit: (user: UserData) => void;
  onDelete: (user: UserData) => void;
  onResetPassword: (user: UserData) => void;
}

export function UserRowActions({
  user,
  onEdit,
  onDelete,
  onResetPassword,
}: { user: UserData } & UserRowActionsConfig) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-muted-foreground"
        >
          <Ellipsis />
          <span className="sr-only">Actions for {user.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem onClick={() => onEdit(user)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onResetPassword(user)}>
          Reset password
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(user)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Right-click menu items for a user row — mirrors the actions dropdown. */
export function UserRowContextMenu({
  user,
  onEdit,
  onDelete,
  onResetPassword,
}: { user: UserData } & UserRowActionsConfig) {
  return (
    <ContextMenuGroup>
      <ContextMenuItem onSelect={() => onEdit(user)}>Edit</ContextMenuItem>
      <ContextMenuItem onSelect={() => onResetPassword(user)}>
        Reset password
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onSelect={() => onDelete(user)}>
        Delete
      </ContextMenuItem>
    </ContextMenuGroup>
  );
}
