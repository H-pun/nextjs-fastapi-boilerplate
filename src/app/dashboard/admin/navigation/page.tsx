"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ChevronDown,
  CornerDownRight,
  Eye,
  ListTree,
  Plus,
  Save,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

import { getNavigation, saveNavigation } from "@/lib/api/navigation";
import { navigationListSchema, type Navigation } from "@/lib/types/navigation";

import { MenuDetail } from "./_components/menu-detail";
import { MenuTree } from "./_components/menu-tree";
import { RolePreview, useRolePreview } from "./_components/role-preview";
import { RemoveMenuDialog } from "./_components/remove-menu-dialog";
import { groupName, isSelfMenu, summarizeChanges } from "./_components/tree";

const blankMenu = (group?: string): Navigation => ({
  id: crypto.randomUUID(),
  title: "",
  url: "/",
  order: 0,
  external: false,
  idScope: null,
  ...(group ? { group } : {}),
});

/** Where the selected id sits in the array, falling back to the first menu so
 *  the detail pane is never blank while the tree has rows. */
function resolveSelection(navigations: Navigation[], id: string | null) {
  const parent = navigations.findIndex((nav) => nav.id === id);
  if (parent >= 0) return { parent, child: -1 };

  for (const [index, nav] of navigations.entries()) {
    const child = (nav.children ?? []).findIndex((c) => c.id === id);
    if (child >= 0) return { parent: index, child };
  }

  return { parent: navigations.length > 0 ? 0 : -1, child: -1 };
}

export default function Page() {
  const groupListId = useId();
  const hideRowsId = useId();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [previewRoleId, setPreviewRoleId] = useState<string | null>(null);
  const [hideRows, setHideRows] = useState(false);
  // Which row the confirm dialog is about. The tree can ask about any row, not
  // only the one the detail pane happens to be showing.
  const [pendingRemove, setPendingRemove] = useState<{
    parent: number;
    child: number;
  } | null>(null);

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ["navigation"],
    queryFn: getNavigation,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60,
    // A background refetch feeds straight into `values` below, which would
    // overwrite whatever is half-edited on screen.
    refetchOnWindowFocus: false,
  });

  const values = useMemo(
    () =>
      data
        ? {
          // The column is nullable but a text input must never be handed
          // null, so null and "no section" collapse to the same empty string.
          navigations: data.map((nav) => ({
            ...nav,
            group: nav.group ?? "",
          })),
        }
        : undefined,
    [data]
  );

  const form = useForm({
    resolver: zodResolver(navigationListSchema),
    defaultValues: { navigations: [] as Navigation[] },
    values,
    mode: "onChange",
  });

  const root = useFieldArray({
    control: form.control,
    name: "navigations",
    keyName: "_key",
  });

  // The tree paints from live values, not from `fields`, so a title typed in
  // the detail pane updates the row next to it as you type.
  const navigations = useWatch({
    control: form.control,
    name: "navigations",
  }) as Navigation[];

  const { mutateAsync, isPending } = useMutation({
    mutationFn: saveNavigation,
    onSuccess: () => {
      // Same query keys the sidebar reads, so it repaints with the new menu.
      queryClient.refetchQueries({ queryKey: ["navigation"] });
      queryClient.refetchQueries({ queryKey: ["navigation", "me"] });
      toast.success("Navigation updated");
    },
    onError: () => toast.error("Could not save the navigation. Try again."),
  });

  const { isDirty } = form.formState;
  const isLoading = isFetching || isPending;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // Suggestions only — "no section" is the empty value, not something to pick.
  const groupOptions = useMemo(
    () => [...new Set(navigations.map(groupName))].filter(Boolean),
    [navigations]
  );

  const selection = resolveSelection(navigations, selectedId);

  // One Save covers the whole tree, so the editor has to say which rows it is
  // about to write instead of a bare "unsaved changes".
  const changes = useMemo(
    () => summarizeChanges(data ?? [], navigations),
    [data, navigations]
  );

  const preview = useRolePreview(navigations, previewRoleId);

  const changeSummary = [
    changes.edited && `${changes.edited} edited`,
    changes.added && `${changes.added} added`,
    changes.removed && `${changes.removed} removed`,
    changes.restructured && "order changed",
  ]
    .filter(Boolean)
    .join(" · ");

  const onSubmit = form.handleSubmit(
    async ({ navigations: edited }) => {
      await mutateAsync({
        // Position in the list is the order — renumber on the way out rather
        // than writing it back into form state on every drag.
        navigations: edited.map((nav, index) => ({
          ...nav,
          order: index,
          children: nav.children?.map((child, childIndex) => ({
            ...child,
            order: childIndex,
          })),
        })),
      });
    },
    () =>
      toast.error("Some menus are incomplete. Check the highlighted fields.")
  );

  const addMenu = () => {
    // Lands in the section being looked at, which is nearly always the one the
    // new menu belongs to.
    const section = navigations[selection.parent]
      ? groupName(navigations[selection.parent])
      : undefined;
    const menu = blankMenu(section);
    root.append(menu);
    setSelectedId(menu.id);
  };

  // The tree adds under the row you point at; the toolbar adds under the row
  // the detail pane is showing.
  const addSubmenuTo = (parentIndex: number) => {
    if (!navigations[parentIndex]) return;
    const child = blankMenu();
    root.replace(
      navigations.map((nav, index) =>
        index === parentIndex
          ? { ...nav, children: [...(nav.children ?? []), child] }
          : nav
      )
    );
    setSelectedId(child.id);
  };

  const addSubmenu = () => addSubmenuTo(selection.parent);

  const removeAt = (parentIndex: number, childIndex: number) => {
    if (childIndex >= 0) {
      root.replace(
        navigations.map((nav, index) =>
          index === parentIndex
            ? {
              ...nav,
              children: (nav.children ?? []).filter(
                (_, i) => i !== childIndex
              ),
            }
            : nav
        )
      );
      setSelectedId(navigations[parentIndex].id);
      return;
    }
    root.remove(parentIndex);
    setSelectedId(null);
  };

  const listError =
    form.formState.errors.navigations?.root?.message ??
    form.formState.errors.navigations?.message;

  // Nothing selected still lands on the first menu, so the tree has to
  // highlight what the detail pane is actually showing.
  const resolvedId =
    (selection.child >= 0
      ? navigations[selection.parent]?.children?.[selection.child]?.id
      : navigations[selection.parent]?.id) ?? null;

  // The toolbar acts on whatever the detail pane is showing, so it has to name
  // that menu rather than leave you guessing.
  const selectedParent = navigations[selection.parent];
  const selectedParentTitle = selectedParent?.title;
  const selectedNav =
    selection.child >= 0
      ? selectedParent?.children?.[selection.child]
      : selectedParent;
  const selectedTitle = selectedNav?.title;
  // Same rule the detail pane enforces: the row linking here cannot go.
  const removeLocked = !!selectedNav && isSelfMenu(selectedNav);

  const removeParent = pendingRemove && navigations[pendingRemove.parent];
  const removeTarget =
    pendingRemove && pendingRemove.child >= 0
      ? removeParent?.children?.[pendingRemove.child]
      : removeParent;

  const showSkeleton = isFetching && !data;
  const showTree = !showSkeleton && !isError && navigations.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Sidebar Menu Manager"
        description="Arrange the single sidebar menu; each item is gated by the scope you attach to it."
      />

      <FormProvider {...form}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-wrap items-center gap-2">
            {showTree && (
              <RolePreview
                value={previewRoleId}
                roles={preview.roles}
                disabled={isLoading}
                onValueChange={setPreviewRoleId}
              />
            )}

            {showTree && preview.role && (
              <div className="flex items-center gap-2">
                <Switch
                  id={hideRowsId}
                  checked={hideRows}
                  onCheckedChange={setHideRows}
                  disabled={isLoading}
                />
                <Label htmlFor={hideRowsId} className="text-sm font-normal">
                  Hide the rest
                </Label>
              </div>
            )}

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {/* Split button: the common action stays one click, and the two
                  that act on the selected row sit behind the chevron. */}
              <ButtonGroup>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMenu}
                  disabled={isLoading}
                >
                  <Plus />
                  Add menu
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="More menu actions"
                      disabled={isLoading}
                    >
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {/* Both act on whatever the detail pane shows, so they name
                        it instead of leaving you to guess. */}
                    <DropdownMenuItem
                      onSelect={addSubmenu}
                      disabled={selection.parent < 0}
                    >
                      <CornerDownRight />
                      <span className="min-w-0 flex-1 truncate">
                        Add submenu
                        {selectedParentTitle
                          ? ` under ${selectedParentTitle}`
                          : ""}
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() =>
                        setPendingRemove({
                          parent: selection.parent,
                          child: selection.child,
                        })
                      }
                      disabled={selection.parent < 0 || removeLocked}
                    >
                      <Trash2 />
                      <span className="min-w-0 flex-1 truncate">
                        Delete {selectedTitle || "selected menu"}
                      </span>
                    </DropdownMenuItem>
                    {/* A disabled item takes no pointer events, so the reason
                        has to be printed rather than left to a tooltip. */}
                    {removeLocked && (
                      <p className="text-muted-foreground px-1.5 pt-0.5 pb-1 text-xs">
                        The sidebar link to this page cannot be deleted.
                      </p>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
              <Button
                type="submit"
                variant={isDirty ? "default" : "outline"}
                disabled={!isDirty || isLoading}
              >
                {isPending ? <Spinner /> : <Save />}
                Save Changes
              </Button>
            </div>
          </div>

          <datalist id={groupListId}>
            {groupOptions.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>

          {showSkeleton ? (
            <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
              <Skeleton className="h-[28rem] w-full rounded-lg" />
              <Skeleton className="h-[28rem] w-full rounded-lg" />
            </div>
          ) : isError ? (
            /* Without this branch a failed load looks like "no menus", and
               saving from there would wipe the real ones. */
            <Empty className="rounded-lg border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <TriangleAlert />
                </EmptyMedia>
                <EmptyTitle>Could not load the menu</EmptyTitle>
                <EmptyDescription>
                  Nothing was changed. Retry before editing — saving an empty
                  list would remove every menu.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" onClick={() => refetch()}>
                  Retry
                </Button>
              </EmptyContent>
            </Empty>
          ) : !showTree ? (
            <Empty className="rounded-lg border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListTree />
                </EmptyMedia>
                <EmptyTitle>No menus yet</EmptyTitle>
                <EmptyDescription>
                  Everyone would see an empty sidebar. Add the first menu to fix
                  that.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" onClick={addMenu} disabled={isLoading}>
                  <Plus />
                  Add menu
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
              <div className="bg-card space-y-2 rounded-lg border p-2">
                <div className="relative">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search menus..."
                    className="pl-7"
                    disabled={isLoading}
                  />
                </div>

                {preview.role && (
                  <p className="text-muted-foreground bg-muted/50 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs">
                    <Eye className="mt-px size-3.5 shrink-0" />
                    <span>
                      {preview.role.name} sees {preview.visible} of{" "}
                      {preview.total} menus.
                    </span>
                  </p>
                )}
                <MenuTree
                  navigations={navigations}
                  selectedId={resolvedId}
                  touched={changes.touched}
                  hidden={preview.hidden}
                  // Clearing the preview must not leave the switch dropping rows.
                  hideRows={!!preview.role && hideRows}
                  isLoading={isLoading}
                  search={search}
                  onSelect={setSelectedId}
                  onAddSubmenu={addSubmenuTo}
                  onRemove={(parent, child) =>
                    setPendingRemove({ parent, child })
                  }
                  onReplace={(next) => root.replace(next)}
                />
              </div>

              {/* Sticks while the full tree scrolls past. Needs the grid's
                  items-start, or the cell would stretch and leave no travel. */}
              <div className="bg-card rounded-lg border p-4 lg:sticky lg:top-20">
                {selection.parent >= 0 && (
                  <MenuDetail
                    key={resolvedId ?? "none"}
                    parentIndex={selection.parent}
                    childIndex={selection.child}
                    groupListId={groupListId}
                    isLoading={isLoading}
                    onAddSubmenu={addSubmenu}
                    onRemove={() =>
                      setPendingRemove({
                        parent: selection.parent,
                        child: selection.child,
                      })
                    }
                  />
                )}
              </div>
            </div>
          )}

          <RemoveMenuDialog
            open={!!pendingRemove}
            title={removeTarget?.title}
            isChild={(pendingRemove?.child ?? -1) >= 0}
            submenuCount={removeParent?.children?.length ?? 0}
            onOpenChange={(open) => !open && setPendingRemove(null)}
            onConfirm={() =>
              pendingRemove &&
              removeAt(pendingRemove.parent, pendingRemove.child)
            }
          />

          {listError && <p className="text-destructive text-sm">{listError}</p>}

          {isDirty && (
            <div className="bg-card sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 shadow-lg">
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">
                  {changeSummary || "Unsaved changes"}
                </span>{" "}
                — the sidebar updates for everyone once you save.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => form.reset({ navigations: data ?? [] })}
                >
                  Discard
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isPending ? <Spinner /> : <Save />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </form>
      </FormProvider>
    </div>
  );
}
