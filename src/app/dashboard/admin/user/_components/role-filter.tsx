"use client";

import { Shield, X } from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import type { Role } from "@/lib/types/access";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL_ROLES = "all";

export function RoleFilter({
  roles,
  onRemove,
}: {
  roles: Role[];
  onRemove?: () => void;
}) {
  const [{ roleId }, setQuery] = useQueryStates(
    {
      roleId: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
    },
    { shallow: false }
  );

  const active = Boolean(roleId);
  const selectedRole = roles.find((role) => role.id === roleId);

  const handleRemove = () => {
    void setQuery({ roleId: null, page: null });
    onRemove?.();
  };

  return (
    <div
      className={cn(
        "inline-flex h-7 items-center gap-0.5 rounded-md border border-transparent",
        active
          ? "border-border bg-background text-foreground"
          : "bg-muted/40 text-muted-foreground"
      )}
    >
      <Select
        value={roleId || ALL_ROLES}
        onValueChange={(value) => {
          void setQuery({
            roleId: value === ALL_ROLES ? null : value,
            page: null,
          });
          if (value === ALL_ROLES) onRemove?.();
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label="Filter by role"
          className={cn(
            "h-7 w-auto max-w-40 gap-1 rounded-md border-0 border-transparent px-2 font-normal shadow-none",
            "bg-transparent hover:bg-transparent hover:text-inherit"
          )}
        >
          <Shield className="size-3.5 shrink-0" />
          <span className="max-w-32 truncate">
            {active && selectedRole ? selectedRole.name : "Roles"}
          </span>
          <SelectValue className="sr-only" />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value={ALL_ROLES}>All roles</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Remove role filter"
        className="text-muted-foreground hover:text-foreground size-7 shrink-0 rounded-md"
        onClick={handleRemove}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}
