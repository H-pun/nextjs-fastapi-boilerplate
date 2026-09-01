"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

import { ChevronRight } from "lucide-react";

import { NavIcon } from "@/components/nav-icon";
import { Navigation } from "@/lib/types/navigation";

function groupBySection(items: Navigation[]) {
  const groups: { group: string; items: Navigation[] }[] = [];
  for (const item of items) {
    const key = item.group?.trim() || "";
    let bucket = groups.find((g) => g.group === key);
    if (!bucket) {
      bucket = { group: key, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(item);
  }
  return groups;
}

export function NavMain({
  items,
  loading,
}: {
  items?: Navigation[];
  loading: boolean;
}) {
  const pathname = usePathname();
  const groups = useMemo(() => groupBySection(items ?? []), [items]);

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <SidebarMenuItem key={`sk-item-${i}`}>
              <div className="flex h-8 items-center gap-2 rounded-md px-2">
                <Skeleton className="size-4 rounded-md" />
                <Skeleton className="h-4 flex-1" />
              </div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <>
      {groups.map((g) => {
        return (
          <Collapsible
            key={g.group || "__ungrouped"}
            defaultOpen
            className="group/section"
          >
            <SidebarGroup className="py-1">
              {g.group && (
                <SidebarGroupLabel
                  asChild
                  className="text-sidebar-foreground/60 text-[10px] font-medium tracking-[0.12em] uppercase hover:underline"
                >
                  <CollapsibleTrigger>
                    {g.group}
                    <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/section:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
              )}
              <CollapsibleContent>
                <SidebarMenu>
                  {g.items.map((item) => {
                    const hasChildren = !!item.children?.length;

                    if (hasChildren) {
                      const branchActive = item.children!.some(
                        (c) => pathname === c.url
                      ) || pathname === item.url || pathname.startsWith(`${item.url}/`);

                      return (
                        <Collapsible
                          key={item.id}
                          asChild
                          defaultOpen={branchActive}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                tooltip={item.title}
                                isActive={branchActive}
                              >
                                {item.icon && <NavIcon name={item.icon} />}
                                <span>{item.title}</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children!.map((child) => {
                                  const href = child.url || "#";
                                  return (
                                    <SidebarMenuSubItem key={child.id}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={pathname === href}
                                      >
                                        <Link
                                          href={href}
                                          target={child.external ? "_blank" : "_self"}
                                          rel={child.external ? "noopener noreferrer" : undefined}
                                        >
                                          <span>{child.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  );
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }

                    const active = item.url !== "#" && pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.title}
                          isActive={active}
                        >
                          <Link
                            href={item.url || "#"}
                            target={item.external ? "_blank" : "_self"}
                            rel={item.external ? "noopener noreferrer" : undefined}
                          >
                            {item.icon && <NavIcon name={item.icon} />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                        {item.badge && (
                          <SidebarMenuBadge className="bg-primary top-1.5 font-mono !text-white">
                            {item.badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </>
  );
}
