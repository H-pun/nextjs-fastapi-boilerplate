"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { getScopes } from "@/lib/api/access";
import { ComboboxField } from "./combobox-field";

/**
 * Picks the scope that gates a menu item. The form stores the scope id, but
 * admins recognise scopes by key, so the combobox works in keys and maps back.
 * Every row mounts one of these — React Query dedupes the request.
 */
export function ScopePicker({
  value,
  onValueChange,
  disabled,
}: {
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const { data: scopes } = useQuery({
    queryKey: ["scopes"],
    queryFn: getScopes,
    staleTime: Infinity,
  });

  const keys = useMemo(() => (scopes ?? []).map((s) => s.key), [scopes]);
  const selectedKey = scopes?.find((s) => s.id === value)?.key ?? null;
  const descOf = (key: string) =>
    scopes?.find((s) => s.key === key)?.description ?? key;

  return (
    <ComboboxField
      value={selectedKey}
      onValueChange={(key) =>
        onValueChange(
          key ? (scopes?.find((s) => s.key === key)?.id ?? null) : null
        )
      }
      items={keys}
      disabled={disabled}
      placeholder="Everyone"
      searchPlaceholder="Search scope..."
      emptyText="No scopes found."
      clearLabel="Everyone with the role"
      searchText={(key) => `${key} ${descOf(key)}`}
      renderValue={(key) => <span className="truncate font-mono">{key}</span>}
      renderItem={(key) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono font-medium">{key}</span>
          {descOf(key) !== key && (
            <span className="text-muted-foreground truncate text-xs">{descOf(key)}</span>
          )}
        </span>
      )}
    />
  );
}
