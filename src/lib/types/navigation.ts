import { z } from "zod";
import { type IconName } from "lucide-react/dynamic";

export const navigationChildSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Title required"),
  url: z.string().min(1, "URL required"),
  order: z.number().nonnegative(),
  external: z.boolean(),
  icon: z.custom<IconName>().nullish(),
});

export const navigationSchema = navigationChildSchema.extend({
  children: z.array(navigationChildSchema).optional(),
});

export const navigationFormSchema = z.object({
  navigations: z
    .array(navigationSchema)
    .min(1, "At least one navigation is required"),
  roleId: z.string().uuid(),
});

export type Navigation = z.infer<typeof navigationSchema>;
export type NavigationForm = z.infer<typeof navigationFormSchema>;
