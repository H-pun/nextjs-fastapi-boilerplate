"use client";

import * as LucideIcons from "lucide-react";
import { type IconName } from "lucide-react/dynamic";
import { upperFirst, camelCase } from "lodash";
import { cn } from "@/lib/utils";

interface NavIconProps {
  name: IconName;
  className?: string;
}

export function NavIcon({ name, className }: NavIconProps) {
  const key = upperFirst(camelCase(name)) as keyof typeof LucideIcons;
  const Icon = (LucideIcons[key] ?? LucideIcons.AlertCircle) as React.ComponentType<{ className?: string }>;
  return <Icon className={cn("size-4", className)} />;
}
