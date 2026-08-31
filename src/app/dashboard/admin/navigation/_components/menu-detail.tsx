"use client";

import { Controller, useFormContext } from "react-hook-form";
import { ChevronRight, Lock, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { NavigationList } from "@/lib/types/navigation";

import { IconPicker } from "./icon-picker";
import { ScopePicker } from "./scope-picker";
import { SELF_URL, isSelfMenu, pointsToSelf } from "./tree";

export function MenuDetail({
  parentIndex,
  childIndex,
  groupListId,
  isLoading,
  onAddSubmenu,
  onRemove,
}: {
  parentIndex: number;
  /** -1 when a top-level menu is selected. */
  childIndex: number;
  groupListId: string;
  isLoading: boolean;
  onAddSubmenu: () => void;
  onRemove: () => void;
}) {
  const { control, register, formState, watch } =
    useFormContext<NavigationList>();

  const isChild = childIndex >= 0;
  const path = isChild
    ? (`navigations.${parentIndex}.children.${childIndex}` as const)
    : (`navigations.${parentIndex}` as const);

  const parentErrors = formState.errors.navigations?.[parentIndex];
  const errors = isChild ? parentErrors?.children?.[childIndex] : parentErrors;

  const parent = watch(`navigations.${parentIndex}`);
  const section = parent?.group?.trim();
  const title = watch(`${path}.title`);
  const submenuCount = parent?.children?.length ?? 0;

  // Deleting the link to this very page locks the editor away behind a typed
  // URL, so that one row keeps its Remove button switched off.
  const selected = watch(path);
  const locked = !!selected && isSelfMenu(selected);
  // Editing the address away would unlock Remove on the next keystroke, so the
  // one field the lock depends on is the one field held still.
  const selfLink = pointsToSelf(selected?.url);

  return (
    <div className="space-y-5">
      <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
        <span className={section ? undefined : "italic"}>
          {section || "No section"}
        </span>
        <ChevronRight className="size-3" />
        {isChild ? (
          <>
            <span>{parent?.title || "Untitled"}</span>
            <ChevronRight className="size-3" />
          </>
        ) : null}
        <span className="text-foreground font-medium">
          {title || "Untitled"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {!isChild && (
          <Field className="sm:col-span-2">
            <FieldLabel>Section</FieldLabel>
            <Input
              placeholder="Leave empty to pin above the sections"
              list={groupListId}
              disabled={isLoading}
              {...register(`navigations.${parentIndex}.group`)}
            />
            <p className="text-muted-foreground text-xs">
              A name that does not exist yet starts a new section. Leave it
              empty and the sidebar shows this menu with no header above it.
            </p>
          </Field>
        )}

        {/* Sits beside the icon it will be shown next to. A child has no icon
            of its own, so its title takes the whole row. */}
        <Field
          data-invalid={!!errors?.title}
          className={isChild ? "sm:col-span-2" : undefined}
        >
          <FieldLabel>Title</FieldLabel>
          <Input
            placeholder="e.g. Dashboard"
            disabled={isLoading}
            {...register(`${path}.title`)}
          />
          <FieldError errors={[errors?.title]} />
        </Field>

        {!isChild && (
          <Controller
            control={control}
            name={`navigations.${parentIndex}.icon`}
            render={({ field }) => (
              <Field data-invalid={!!parentErrors?.icon}>
                <FieldLabel>Icon</FieldLabel>
                <IconPicker
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                  disabled={isLoading}
                />
                <FieldError errors={[parentErrors?.icon]} />
              </Field>
            )}
          />
        )}

        {/* Full width: a long URL has to stay readable without scrubbing
            through a half-width input. And a menu with submenus is a
            collapsible header in the sidebar, so it never links anywhere —
            asking for a URL only invites a value that gets ignored. */}
        {isChild || submenuCount === 0 ? (
          <Field data-invalid={!!errors?.url} className="sm:col-span-2">
            <FieldLabel>URL</FieldLabel>
            <Input
              placeholder="/dashboard"
              disabled={isLoading || selfLink}
              {...register(`${path}.url`)}
            />
            {selfLink && (
              <p className="text-muted-foreground text-xs">
                Fixed — this is the address of the page you are on.
              </p>
            )}
            <FieldError errors={[errors?.url]} />
          </Field>
        ) : (
          <Field className="sm:col-span-2">
            <FieldLabel>URL</FieldLabel>
            <p className="text-muted-foreground text-sm">
              This menu only opens its submenus, so it has no address of its
              own. Each submenu carries its own full URL.
            </p>
          </Field>
        )}

        <Controller
          control={control}
          name={`${path}.idScope`}
          render={({ field }) => (
            <Field className="sm:col-span-2">
              <FieldLabel>Scope</FieldLabel>
              <ScopePicker
                value={field.value ?? null}
                onValueChange={field.onChange}
                disabled={isLoading}
              />
              <p className="text-muted-foreground text-xs">
                {field.value
                  ? "Only users whose roles grant this scope see the menu."
                  : "Everyone with this role sees the menu. Pick a scope to narrow it."}
              </p>
            </Field>
          )}
        />

        <Controller
          control={control}
          name={`${path}.external`}
          render={({ field }) => (
            <Field orientation="horizontal" className="sm:col-span-2">
              <Switch
                id={`${path}.external`}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                disabled={isLoading}
              />
              <FieldLabel htmlFor={`${path}.external`}>
                Opens in a new tab
              </FieldLabel>
            </Field>
          )}
        />
      </div>

      {!isChild && (
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm font-medium">Submenus</p>
            <p className="text-muted-foreground text-xs">
              {submenuCount === 0
                ? "This menu links straight to its URL."
                : `${submenuCount} nested under this menu.`}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={onAddSubmenu}
          >
            <Plus />
            Add submenu
          </Button>
        </div>
      )}

      {locked ? (
        <div className="text-muted-foreground flex items-start gap-2 border-t pt-4 text-xs">
          <Lock className="text-foreground mt-0.5 size-3.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-foreground text-sm font-medium">
              This menu cannot be removed
            </p>
            <p>
              {isChild || submenuCount === 0
                ? "It is the sidebar link to this page."
                : "One of its submenus is the sidebar link to this page, and removing a menu removes its submenus too."}{" "}
              Delete it and nobody reaches the menu manager from the sidebar
              again — the only way back would be typing{" "}
              <code className="bg-muted rounded px-1 py-0.5">{SELF_URL}</code>{" "}
              into the address bar. Change its title, icon or position freely.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            <p className="text-sm font-medium">Remove</p>
            <p className="text-muted-foreground text-xs">
              Takes effect when you save.
            </p>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isLoading}
            onClick={onRemove}
          >
            <Trash2 />
            Remove
          </Button>
        </div>
      )}
    </div>
  );
}
