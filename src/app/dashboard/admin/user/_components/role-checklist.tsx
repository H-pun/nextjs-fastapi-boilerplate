"use client";

import { useQuery } from "@tanstack/react-query";

import { getRoles } from "@/lib/api/access";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Pick one or more roles. A checklist rather than a select because a user may
 * hold several — "PM" plus "Team Member" is an ordinary case, not an edge one.
 */
export function RoleChecklist({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string[];
  onChange: (roleIds: string[]) => void;
  disabled?: boolean;
  id?: string;
}) {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No roles yet. Create one under Access Control first.
      </p>
    );
  }

  const toggle = (roleId: string, checked: boolean) =>
    onChange(
      checked ? [...value, roleId] : value.filter((id) => id !== roleId)
    );

  return (
    <div id={id} className="space-y-1 rounded-md border p-2">
      {roles.map((role) => (
        <Label
          key={role.id}
          className="hover:bg-muted flex cursor-pointer items-start gap-2 rounded-sm p-1.5 font-normal"
        >
          <Checkbox
            checked={value.includes(role.id)}
            disabled={disabled}
            onCheckedChange={(checked) => toggle(role.id, checked === true)}
          />
          <span className="grid gap-0.5 leading-tight">
            <span className="text-sm font-medium">{role.name}</span>
            {role.description && (
              <span className="text-muted-foreground text-xs">
                {role.description}
              </span>
            )}
          </span>
        </Label>
      ))}
    </div>
  );
}
