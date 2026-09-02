"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

import type { Role } from "@/lib/types/access";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_ROLES = "all";

export function RoleFilter({ roles }: { roles: Role[] }) {
  const [{ roleId }, setQuery] = useQueryStates(
    {
      roleId: parseAsString.withDefault(""),
      page: parseAsInteger.withDefault(1),
    },
    { shallow: false }
  );

  return (
    <Select
      value={roleId || ALL_ROLES}
      onValueChange={(value) =>
        setQuery({ roleId: value === ALL_ROLES ? null : value, page: null })
      }
    >
      <SelectTrigger className="h-8 w-44" aria-label="Filter by role">
        <SelectValue placeholder="All roles" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_ROLES}>All roles</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
