"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  createRole,
  deleteRole,
  getRoles,
  getScopes,
  setRoleScopes,
  updateRole,
} from "@/lib/api/access";
import type { Role, Scope } from "@/lib/types/access";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Scopes have no parent column — the hierarchy lives in the key, which always
// reads `resource:action`. The part before the colon is the group.
// Unlisted resources still render, using the raw key as their label.
const GROUP_META: Record<string, { label: string; hint: string }> = {
  user: {
    label: "Users & Access",
    hint: "View the user directory, and manage users, roles, and permissions.",
  },
  navigation: {
    label: "Navigation",
    hint: "Read the sidebar menu, and edit its structure and visibility.",
  },
};

type ScopeGroup = {
  key: string;
  label: string;
  hint: string;
  scopes: Scope[];
};

function groupScopes(scopes: Scope[]): ScopeGroup[] {
  const groups: ScopeGroup[] = [];
  // The API returns these ordered by key, so the resource prefix already keeps
  // each group contiguous — no sort here to disagree with it.
  for (const scope of scopes) {
    const key = scope.key.split(":")[0];
    let bucket = groups.find((g) => g.key === key);
    if (!bucket) {
      const meta = GROUP_META[key];
      bucket = {
        key,
        label: meta?.label ?? key,
        hint: meta?.hint ?? "",
        scopes: [],
      };
      groups.push(bucket);
    }
    bucket.scopes.push(scope);
  }
  return groups;
}

const emptyForm = { name: "", description: "" };

export default function Page() {
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: getRoles,
  });
  const { data: scopes = [], isLoading: scopesLoading } = useQuery({
    queryKey: ["scopes"],
    queryFn: getScopes,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Unsaved edits per role id (scope keys). Absent = pristine (use role.scopes).
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  // Tracks which groups are open, so the page starts fully collapsed.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Role | null>(null);
  const [form, setForm] = useState(emptyForm);

  const scopeIdByKey = useMemo(
    () => new Map(scopes.map((s) => [s.key, s.id])),
    [scopes]
  );

  const active = useMemo(
    () => roles.find((r) => r.id === selectedId) ?? roles[0],
    [roles, selectedId]
  );

  // Derived (no effect): the checkbox state = draft override or the role's scopes.
  const enabled = useMemo(() => {
    if (!active) return new Set<string>();
    return new Set(drafts[active.id] ?? active.scopes.map((s) => s.key));
  }, [active, drafts]);

  const dirtyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const role of roles) {
      const draft = drafts[role.id];
      if (!draft) continue;
      const saved = new Set(role.scopes.map((s) => s.key));
      if (draft.length !== saved.size || draft.some((k) => !saved.has(k)))
        ids.add(role.id);
    }
    return ids;
  }, [roles, drafts]);

  const dirty = !!active && dirtyIds.has(active.id);

  useEffect(() => {
    if (dirtyIds.size === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyIds]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["roles"] });

  const clearDraft = (roleId: string) =>
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[roleId];
      return next;
    });

  const saveScopesMutation = useMutation({
    mutationFn: () => {
      if (!active) throw new Error("no role");
      const ids = [...enabled]
        .map((key) => scopeIdByKey.get(key))
        .filter((v): v is string => Boolean(v));
      return setRoleScopes(active.id, ids);
    },
    onSuccess: (role) => {
      toast.success("Role permissions saved");
      clearDraft(role.id);
      invalidate();
    },
    onError: () => toast.error("Failed to save permissions"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createRole({
        name: form.name,
        description: form.description.trim() || undefined,
      }),
    onSuccess: (role) => {
      toast.success("Role created");
      setAddOpen(false);
      setForm(emptyForm);
      setSelectedId(role.id);
      invalidate();
    },
    onError: () => toast.error("Failed to create role"),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      if (!active) throw new Error("no role");
      return updateRole(active.id, {
        name: form.name,
        description: form.description.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Role updated");
      setEditOpen(false);
      invalidate();
    },
    onError: () => toast.error("Failed to update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: (_data, id) => {
      toast.success("Role removed");
      setToDelete(null);
      setSelectedId(null);
      clearDraft(id);
      invalidate();
    },
    onError: () => toast.error("Failed to remove role"),
  });

  const setMany = (keys: string[], on: boolean) => {
    if (!active) return;
    setDrafts((prev) => {
      const set = new Set(prev[active.id] ?? active.scopes);
      for (const key of keys) {
        if (on) set.add(key);
        else set.delete(key);
      }
      return { ...prev, [active.id]: [...set] };
    });
  };

  const visibleScopes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopes;
    return scopes.filter(
      (s) =>
        s.key.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false)
    );
  }, [scopes, search]);

  const groups = useMemo(() => groupScopes(visibleScopes), [visibleScopes]);

  const readOnly = !active;

  const renderRole = (r: Role) => {
    const isSelected = active?.id === r.id;
    const count = (drafts[r.id] ?? r.scopes).length;
    return (
      <button
        key={r.id}
        type="button"
        onClick={() => setSelectedId(r.id)}
        className={cn(
          "flex h-[38px] w-full items-center gap-2.5 border-b px-4 text-left text-sm transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted/60"
        )}
      >
        <span className="flex size-3 flex-none items-center justify-center">
          <span
            className={cn(
              "size-2 rounded-full",
              isSelected ? "bg-primary" : "bg-muted-foreground/40"
            )}
          />
        </span>
        <span className="flex-1 truncate">
          {r.name}
        </span>
        {dirtyIds.has(r.id) && (
          <span
            title="Unsaved changes"
            className="bg-primary size-1.5 rounded-full"
          />
        )}
        <span
          className={cn(
            "font-mono text-xs",
            isSelected ? "text-primary" : "text-muted-foreground"
          )}
        >
          {count}
        </span>
      </button>
    );
  };

  // Bulk actions act on what's on screen, so they stay predictable while filtering.
  const visibleKeys = visibleScopes.map((s) => s.key);
  const allVisibleOn =
    visibleKeys.length > 0 && visibleKeys.every((k) => enabled.has(k));

  // Tri-state, same convention as the per-group checkbox below it.
  const allVisibleState: boolean | "indeterminate" = allVisibleOn
    ? true
    : visibleKeys.some((k) => enabled.has(k))
      ? "indeterminate"
      : false;

  // A search would otherwise hide its own matches inside collapsed groups,
  // so filtering forces every group open.
  const isGroupOpen = (key: string) => !!search || expanded.has(key);

  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const groupState = (group: ScopeGroup): boolean | "indeterminate" => {
    const on = group.scopes.filter((s) => enabled.has(s.key)).length;
    if (on === 0) return false;
    return on === group.scopes.length ? true : "indeterminate";
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Scopes granted per role. Frontend visibility only — the API enforces authorization."
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[280px_1fr]">
        {/* Role list */}
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Role</p>
            {dirtyIds.size > 0 && (
              <span className="text-muted-foreground text-xs">
                {dirtyIds.size} unsaved
              </span>
            )}
          </div>
          {rolesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b px-4 py-2.5">
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : (
            roles.map(renderRole)
          )}
          <div className="p-3">
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => {
                setForm(emptyForm);
                setAddOpen(true);
              }}
            >
              <Plus className="size-4" /> Add new role
            </Button>
          </div>
        </Card>

        {/* Scopes */}
        <Card className="gap-0 overflow-hidden py-0">
          <div className="border-b p-[18px]">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[240px] flex-1">
                <p className="mb-1 text-[15px] font-semibold tracking-[-0.01em]">
                  {active?.name ?? "—"} permissions
                </p>
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-medium">
                    {enabled.size} scope(s)
                  </span>{" "}
                  enabled
                  {dirty && " · unsaved changes"}
                </p>
              </div>
              {active && (
                <div className="flex flex-none items-center gap-2 text-sm">
                  <Button
                    variant="outline"
                    onClick={() => clearDraft(active.id)}
                    disabled={!dirty || saveScopesMutation.isPending}
                  >
                    <RotateCcw />
                    Reset
                  </Button>
                  <Button
                    onClick={() => saveScopesMutation.mutate()}
                    disabled={!dirty || saveScopesMutation.isPending}
                  >
                    {saveScopesMutation.isPending && <Spinner />}
                    Save permissions
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="More role actions"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setForm({
                            name: active.name,
                            description: active.description ?? "",
                          });
                          setEditOpen(true);
                        }}
                      >
                        <Pencil />
                        Edit role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setToDelete(active)}
                      >
                        <Trash2 />
                        Remove role
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            {/* Search stays available on system roles — only the mutating
                controls are hidden. */}
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-[15px] -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search scope…"
                className="h-[34px] pl-8"
              />
            </div>
          </div>

          {/* Scope table */}
          {scopesLoading ? (
            <div className="flex flex-col gap-3 p-[18px]">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : visibleScopes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldOff />
                </EmptyMedia>
                <EmptyTitle>
                  {search
                    ? `No scope matches “${search}”`
                    : "No scopes available"}
                </EmptyTitle>
                <EmptyDescription>
                  {search
                    ? "Try a shorter keyword, or search by scope key such as “projects” or “timesheets”."
                    : "The scope catalog is empty. Run the access seeder to populate it."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            // table-fixed: without it the column widths are derived from the
            // visible cells, so expanding a group shifts the Key column.
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={allVisibleState}
                      disabled={readOnly}
                      onCheckedChange={() =>
                        setMany(visibleKeys, !allVisibleOn)
                      }
                      aria-label={
                        search
                          ? `Toggle all ${visibleKeys.length} matching scopes`
                          : "Toggle every scope"
                      }
                    />
                  </TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="w-[360px]">Key</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => {
                  const state = groupState(group);
                  const open = isGroupOpen(group.key);
                  return (
                    <Fragment key={group.key}>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell className="text-center">
                          <Checkbox
                            checked={state}
                            disabled={readOnly}
                            onCheckedChange={() =>
                              setMany(
                                group.scopes.map((s) => s.key),
                                state !== true
                              )
                            }
                            aria-label={`Toggle every ${group.label} scope`}
                          />
                        </TableCell>
                        <TableCell
                          colSpan={2}
                          className="p-0 whitespace-normal"
                        >
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.key)}
                            aria-expanded={open}
                            className="flex w-full items-center gap-1.5 px-2 py-2 text-left"
                          >
                            {/* Pulled into the checkbox column's gutter so the
                                group label lines up with the "Scope" header
                                and the scope rows below it. */}
                            <ChevronRight
                              className={cn(
                                "text-muted-foreground -ml-5 size-3.5 flex-none transition-transform",
                                open && "rotate-90"
                              )}
                            />
                            <span className="min-w-0">
                              <span className="flex items-center gap-1.5 text-sm font-semibold">
                                {group.label}
                                <span className="text-muted-foreground font-mono text-xs font-normal">
                                  {
                                    group.scopes.filter((s) =>
                                      enabled.has(s.key)
                                    ).length
                                  }
                                  /{group.scopes.length}
                                </span>
                              </span>
                              {group.hint && (
                                <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                                  {group.hint}
                                </span>
                              )}
                            </span>
                          </button>
                        </TableCell>
                      </TableRow>
                      {open &&
                        group.scopes.map((s) => (
                          <TableRow
                            key={s.id}
                            onClick={
                              readOnly
                                ? undefined
                                : () => setMany([s.key], !enabled.has(s.key))
                            }
                            className={cn(!readOnly && "cursor-pointer")}
                          >
                            {/* The row already toggles; let the checkbox handle
                                its own click so the two don't cancel out. */}
                            <TableCell
                              className="text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={enabled.has(s.key)}
                                disabled={readOnly}
                                onCheckedChange={() =>
                                  setMany([s.key], !enabled.has(s.key))
                                }
                                aria-label={s.key}
                              />
                            </TableCell>
                            <TableCell className="text-sm leading-[1.45] whitespace-normal">
                              {s.description ?? s.key}
                            </TableCell>
                            <TableCell>
                              <code className="text-muted-foreground font-mono text-xs">
                                {s.key}
                              </code>
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="text-muted-foreground border-t px-[18px] py-3 text-xs">
            Showing {visibleScopes.length} of {scopes.length} scopes
          </div>
        </Card>
      </div>

      {/* Add role dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Add new role</DialogTitle>
            <DialogDescription>
              Create a custom role. Assign scopes after creating it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 block text-xs">Name *</Label>
              <Input
                placeholder="e.g. Auditor"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Description</Label>
              <Textarea
                placeholder="What is this role for?"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                form.name.trim().length < 1
              }
            >
              {createMutation.isPending && <Spinner />}
              Create role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              Update role name or description.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="mb-1.5 block text-xs">Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">Description</Label>
              <Textarea
                placeholder="What is this role for?"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter className="mt-5">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending || form.name.trim().length < 1}
            >
              {editMutation.isPending && <Spinner />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Users assigned to this role lose its{" "}
              {toDelete?.scopes.length ?? 0} scope(s) and keep only what their
              other roles grant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toDelete && deleteMutation.mutate(toDelete.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleteMutation.isPending && <Spinner />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
