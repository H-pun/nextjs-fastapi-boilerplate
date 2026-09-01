"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

// Nothing in the option lists is an empty string, so this is safe as the
// "clear the selection" marker.
const NONE = "none";

/**
 * Searchable single-select over a list of string keys. Backs both the icon and
 * the scope picker; each caller supplies its own row rendering.
 */
export function ComboboxField({
  value,
  onValueChange,
  items,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyText,
  clearLabel,
  limit,
  searchText,
  renderValue = (item) => item,
  renderItem = (item) => item,
}: {
  value: string | null;
  onValueChange: (value: string | null) => void;
  items: string[];
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  /** When set, a first option that resets the field to null. */
  clearLabel?: string;
  limit?: number;
  /** What search matches against — set it when a row shows more than its key,
   *  or typing what is on screen finds nothing. Defaults to the item. */
  searchText?: (item: string) => string;
  renderValue?: (item: string) => ReactNode;
  renderItem?: (item: string) => ReactNode;
}) {
  return (
    <Combobox
      value={value ?? null}
      onValueChange={(next) =>
        onValueChange(next === NONE || !next ? null : (next as string))
      }
      disabled={disabled}
      items={clearLabel ? [NONE, ...items] : items}
      limit={limit}
      itemToStringLabel={
        searchText
          ? (item) => (item === NONE ? "" : searchText(item))
          : undefined
      }
    >
      <ComboboxTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          {value ? renderValue(value) : placeholder}
        </span>
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput showTrigger={false} placeholder={searchPlaceholder} />
        <ComboboxList>
          <ComboboxEmpty>{emptyText}</ComboboxEmpty>
          <ComboboxCollection>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item === NONE ? (
                  <span className="text-muted-foreground">{clearLabel}</span>
                ) : (
                  renderItem(item)
                )}
              </ComboboxItem>
            )}
          </ComboboxCollection>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
