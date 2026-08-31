"use client";

import { iconNames, type IconName } from "lucide-react/dynamic";

import { NavIcon } from "@/components/nav-icon";
import { ComboboxField } from "./combobox-field";

export function IconPicker({
  value,
  onValueChange,
  disabled,
}: {
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <ComboboxField
      value={value}
      onValueChange={onValueChange}
      // The full lucide set is ~1500 entries; render only what the search
      // narrows down to.
      items={iconNames as unknown as string[]}
      limit={50}
      disabled={disabled}
      placeholder="Select icon..."
      searchPlaceholder="Search icon..."
      emptyText="No icons found."
      clearLabel="No icon"
      renderValue={(name) => (
        <>
          <NavIcon name={name as IconName} className="size-4 shrink-0" />
          <span className="truncate">{name}</span>
        </>
      )}
      renderItem={(name) => (
        <>
          <NavIcon name={name as IconName} className="size-4 shrink-0" />
          {name}
        </>
      )}
    />
  );
}
