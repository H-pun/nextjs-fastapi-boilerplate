import { z } from "zod";
import { iconNames, type IconName } from "lucide-react/dynamic";

// Empty means "no icon". Anything else has to be a real lucide name, otherwise
// NavIcon silently falls back to an alert circle and nobody notices the typo.
const iconSchema = z
  .custom<IconName>(
    (value) =>
      !value || (iconNames as readonly string[]).includes(value as string),
    "Unknown icon"
  )
  .nullish();

export const navigationChildSchema = z.object({
  // guid, not uuid: z.uuid() enforces the RFC 9562 version and variant bits,
  // which the seeded ids (11111111-1111-1111-1111-111111111101) do not carry.
  // Rows created in the app do, so uuid() would reject exactly the seeded menu.
  id: z.guid(),
  title: z.string().min(1, "Title required"),
  url: z.string().min(1, "URL required"),
  order: z.int().nonnegative(),
  external: z.boolean(),
  icon: iconSchema,
  // Scope that gates this item. Null = always visible (admins bypass anyway).
  // Declared here on purpose: the form round-trips whatever this schema keeps,
  // so an undeclared field would be dropped on save.
  idScope: z.guid().nullish(),
});

export const navigationSchema = navigationChildSchema
  .extend({
    // Section header this menu belongs to in the sidebar (e.g. "Timesheet").
    // Parents sharing the same group render under one label; empty means the
    // menu sits above the sections with no header at all. Nullable because the
    // column is, even though the editor only ever writes a string.
    group: z.string().nullish(),
    // Optional notification count shown as a pill (e.g. pending approvals).
    badge: z.string().optional(),
    children: z.array(navigationChildSchema).optional(),
    // Relaxed here and re-imposed by the refine below: a menu that holds
    // submenus renders as a collapsible header, never a link, so it has no URL
    // to fill in and the editor hides the field.
    url: z.string(),
  })
  .refine((nav) => !!nav.children?.length || nav.url.trim().length > 0, {
    message: "URL required",
    path: ["url"],
  });

/** What the editor holds — a single menu tree. There is no role variant; item
 *  visibility is decided per-item by scope on the server. */
export const navigationListSchema = z.object({
  navigations: z
    .array(navigationSchema)
    .min(1, "Keep at least one menu — an empty sidebar strands everyone."),
});

export const navigationFormSchema = navigationListSchema;

export type Navigation = z.infer<typeof navigationSchema>;
export type NavigationList = z.infer<typeof navigationListSchema>;
export type NavigationForm = z.infer<typeof navigationFormSchema>;
