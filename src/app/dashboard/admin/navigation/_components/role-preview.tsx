"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoles, getScopes } from "@/lib/api/access";
import type { Navigation } from "@/lib/types/navigation";

import { countRows, hiddenForScopes } from "./tree";

const NO_PREVIEW = "none";

/** Stable identity: a fresh Set every render would re-run the rows below it. */
const NOTHING_HIDDEN: Set<string> = new Set();

/**
 * What a role sees, read off the tree in the form rather than the saved one —
 * so a scope you just attached shows its effect before Save.
 */
export function useRolePreview(
  navigations: Navigation[],
  roleId: string | null
) {
  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    staleTime: Infinity,
  });
  const { data: scopes } = useQuery({
    queryKey: ["scopes"],
    queryFn: getScopes,
    staleTime: Infinity,
  });

  const role = roles?.find((r) => r.id === roleId) ?? null;

  const hidden = useMemo(() => {
    if (!role || !scopes) return NOTHING_HIDDEN;
    return hiddenForScopes(
      navigations,
      new Map(scopes.map((scope) => [scope.id, scope.key])),
      new Set(role.scopes.map(s => s.key))
    );
  }, [navigations, role, scopes]);

  const total = countRows(navigations);

  return { roles: roles ?? [], role, hidden, total, visible: total - hidden.size };
}

export function RolePreview({
  value,
  roles,
  disabled,
  onValueChange,
}: {
  value: string | null;
  roles: { id: string; name: string }[];
  disabled?: boolean;
  onValueChange: (roleId: string | null) => void;
}) {
  return (
    <Select
      value={value ?? NO_PREVIEW}
      disabled={disabled}
      onValueChange={(next) =>
        onValueChange(next === NO_PREVIEW ? null : next)
      }
    >
      <SelectTrigger className="w-full sm:w-56" aria-label="Preview as role">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_PREVIEW}>Preview as: everyone</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            Preview as: {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
