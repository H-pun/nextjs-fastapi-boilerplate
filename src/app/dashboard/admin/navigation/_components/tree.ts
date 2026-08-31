import type { Navigation } from "@/lib/types/navigation";

/**
 * Sections are not rows in the database — `group` is a string on each menu,
 * and the sidebar builds its section headers by grouping on it at render time
 * (see groupBySection in nav-main.tsx). Everything here derives the same shape
 * so the tree shows what the sidebar will show, and writes back by rewriting
 * that string.
 */

/**
 * A menu with no group. Not a magic label — nav-main.tsx renders this bucket
 * without a section header, which is how a menu is pinned above the sections.
 */
export const UNGROUPED = "";

export type TreeGroup = {
  name: string;
  /** Positions in the flat navigations array, in display order. */
  items: number[];
};

/**
 * One line of the tree. Headers are rows too, which is what lets a drop
 * position mean "first menu under this section" rather than "last menu of the
 * section above" — with menus alone the two are the same slot.
 */
export type TreeRow =
  | { kind: "group"; name: string }
  | { kind: "menu"; index: number };

export function groupName(nav: Navigation) {
  return nav.group?.trim() || UNGROUPED;
}

/** This editor's own page. */
export const SELF_URL = "/dashboard/admin/navigation";

export function pointsToSelf(url?: string) {
  return url?.trim().replace(/\/+$/, "") === SELF_URL;
}

/**
 * Removing the menu that points here is the one edit that cannot be undone
 * from the UI: with the row gone the sidebar has no link back, so the only way
 * in is typing the address. Deleting a parent takes its submenus with it, so a
 * parent counts as locked when a submenu is the one pointing here.
 */
export function isSelfMenu(nav: Navigation) {
  return (
    pointsToSelf(nav.url) ||
    (nav.children ?? []).some((child) => pointsToSelf(child.url))
  );
}

/** Sections in the order the sidebar builds them: by first appearance. */
export function buildGroups(navigations: Navigation[]): TreeGroup[] {
  const groups: TreeGroup[] = [];
  navigations.forEach((nav, index) => {
    const name = groupName(nav);
    let bucket = groups.find((group) => group.name === name);
    if (!bucket) {
      bucket = { name, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(index);
  });
  return groups;
}

/** The tree flattened to draggable rows, headers included. */
export function buildRows(navigations: Navigation[]): TreeRow[] {
  return buildGroups(navigations).flatMap((group): TreeRow[] => [
    { kind: "group", name: group.name },
    ...group.items.map((index): TreeRow => ({ kind: "menu", index })),
  ]);
}

function rebuild(navigations: Navigation[], rows: TreeRow[]): Navigation[] {
  const result: Navigation[] = [];
  let section = UNGROUPED;
  for (const row of rows) {
    if (row.kind === "group") {
      section = row.name;
      continue;
    }
    const nav = navigations[row.index];
    result.push(groupName(nav) === section ? nav : { ...nav, group: section });
  }
  return result;
}

/**
 * Move one row of the tree. A menu adopts the section it lands under, so
 * dragging across a header is how you move a menu between sections. Dragging a
 * header moves the whole section, menus included.
 */
export function moveRow(
  navigations: Navigation[],
  from: number,
  to: number
): Navigation[] {
  const rows = buildRows(navigations);
  const moved = rows[from];
  if (!moved || to < 0 || to >= rows.length || from === to) return navigations;

  if (moved.kind === "menu") {
    const next = [...rows];
    next.splice(from, 1);
    next.splice(to, 0, moved);

    // Above the first header there is no section to adopt, so the menu takes
    // the first one — dropping at the very top means "top of section one".
    if (!next.slice(0, to).some((row) => row.kind === "group")) {
      const first = next.find((row) => row.kind === "group");
      if (!first) return navigations;
      next.splice(to, 1);
      next.splice(next.indexOf(first) + 1, 0, moved);
    }

    return rebuild(navigations, next);
  }

  // Headers carry their menus, so the section moves as one block.
  const groups = buildGroups(navigations);
  const fromGroup = groups.findIndex((group) => group.name === moved.name);
  if (fromGroup < 0) return navigations;

  const size = 1 + groups[fromGroup].items.length;
  const remaining = [...rows];
  remaining.splice(from, size);

  const insertAt = Math.min(Math.max(to, 0), remaining.length);
  const toGroup = remaining
    .slice(0, insertAt)
    .filter((row) => row.kind === "group").length;

  return moveGroup(navigations, fromGroup, toGroup);
}

/** Move a whole section, carrying its menus with it. */
export function moveGroup(
  navigations: Navigation[],
  from: number,
  to: number
): Navigation[] {
  const groups = buildGroups(navigations);
  if (!groups[from] || to < 0 || to >= groups.length) return navigations;

  const [moved] = groups.splice(from, 1);
  groups.splice(to, 0, moved);
  return groups.flatMap((group) => group.items.map((i) => navigations[i]));
}

/**
 * Which rows a set of scope keys would not see. Mirrors
 * `get_navigation_for_user` in api/services/navigation.py — including the two
 * that are easy to guess wrong: scopes have a `parentId` but holding the parent
 * grants nothing, and a parent whose submenus are all hidden drops out too.
 */
export function hiddenForScopes(
  navigations: Navigation[],
  scopeKeyById: Map<string, string>,
  held: Set<string>
): Set<string> {
  const hidden = new Set<string>();

  const allowed = (nav: Navigation) => {
    if (!nav.idScope) return true;
    const key = scopeKeyById.get(nav.idScope);
    return !!key && held.has(key);
  };

  for (const nav of navigations) {
    const children = nav.children ?? [];
    const visibleChildren = children.filter(allowed);
    for (const child of children) {
      if (!visibleChildren.includes(child)) hidden.add(child.id);
    }

    if (!allowed(nav) || (children.length > 0 && visibleChildren.length === 0)) {
      hidden.add(nav.id);
      for (const child of children) hidden.add(child.id);
    }
  }

  return hidden;
}

export function countRows(navigations: Navigation[]) {
  return navigations.reduce(
    (total, nav) => total + 1 + (nav.children?.length ?? 0),
    0
  );
}

export type ChangeSummary = {
  /** Ids of menus and submenus that are new or whose fields changed. */
  touched: Set<string>;
  added: number;
  removed: number;
  edited: number;
  /** Order or section membership differs, ignoring what was added or removed. */
  restructured: boolean;
};

// `group` is deliberately absent: a section change is already visible in the
// tree, and marking it would light up every row the admin just dragged.
const COMPARED = ["title", "url", "icon", "idScope", "external"] as const;

function sameFields(a: Navigation, b: Navigation) {
  return COMPARED.every((field) => (a[field] ?? null) === (b[field] ?? null));
}

function flatten(list: Navigation[]) {
  const all = new Map<string, Navigation>();
  for (const nav of list) {
    all.set(nav.id, nav);
    for (const child of nav.children ?? []) all.set(child.id, child);
  }
  return all;
}

/**
 * What changed since the server copy. One Save covers the whole tree, so the
 * editor has to say which rows it is about to write.
 */
export function summarizeChanges(
  original: Navigation[],
  current: Navigation[]
): ChangeSummary {
  const before = flatten(original);
  const after = flatten(current);

  const touched = new Set<string>();
  let added = 0;
  let edited = 0;

  for (const [id, nav] of after) {
    const previous = before.get(id);
    if (!previous) {
      added++;
      touched.add(id);
    } else if (!sameFields(previous, nav)) {
      edited++;
      touched.add(id);
    }
  }

  const removed = [...before.keys()].filter((id) => !after.has(id)).length;

  // Compare the shape of both trees with added and removed rows taken out, so
  // only a genuine move or section change counts. A section left with no kept
  // members drops out too, otherwise deleting the last menu of a section would
  // read as a restructure.
  const signature = (list: Navigation[], keep: (id: string) => boolean) =>
    buildGroups(list)
      .map((group) => {
        const members = group.items
          .filter((index) => keep(list[index].id))
          .flatMap((index) => [
            list[index].id,
            ...(list[index].children ?? [])
              .filter((child) => keep(child.id))
              .map((child) => child.id),
          ]);
        return members.length ? `#${group.name}|${members.join("|")}` : "";
      })
      .filter(Boolean)
      .join("|");

  const restructured =
    signature(original, (id) => after.has(id)) !==
    signature(current, (id) => before.has(id));

  return { touched, added, removed, edited, restructured };
}

/** Renaming a section rewrites `group` on every menu inside it. */
export function renameGroup(
  navigations: Navigation[],
  from: string,
  to: string
): Navigation[] {
  const name = to.trim();
  if (!name || name === from) return navigations;
  return navigations.map((nav) =>
    groupName(nav) === from ? { ...nav, group: name } : nav
  );
}
