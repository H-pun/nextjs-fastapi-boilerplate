"use client";

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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

import { ChevronRight } from "lucide-react";

import { NavIcon } from "@/components/nav-icon";
import { Navigation } from "@/lib/types/navigation";

export function NavMain({
  items,
  loading,
}: {
  items?: Navigation[];
  loading: boolean;
}) {
  const pathname = usePathname();

  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Loading...</SidebarGroupLabel>
        <SidebarMenu>
          {[0, 1, 2].map((i) => (
            <SidebarMenuItem key={`sk-item-${i}`}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}

          <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSub>
              {[0, 1].map((j) => (
                <SidebarMenuSubItem key={`sk-sub-1-${j}`}>
                  <SidebarMenuSkeleton />
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
            <SidebarMenuSub>
              {[0, 1].map((j) => (
                <SidebarMenuSubItem key={`sk-sub-2-${j}`}>
                  <SidebarMenuSkeleton />
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <ScrollArea className="pr-2">
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        <SidebarMenu>
          {items?.map((item) => {
            const isActive =
              pathname === item.url || pathname.startsWith(`${item.url}/`);

            return item.children?.length ? (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                      {item.icon && <NavIcon name={item.icon} />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === item.url + subItem.url}
                          >
                            <Link
                              href={item.url + subItem.url}
                              target={subItem.external ? "_blank" : "_self"}
                              rel={
                                subItem.external
                                  ? "noopener noreferrer"
                                  : undefined
                              }
                            >
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url}>
                  <Link
                    href={item.url}
                    target={item.external ? "_blank" : "_self"}
                    rel={item.external ? "noopener noreferrer" : undefined}
                  >
                    {item.icon && <NavIcon name={item.icon} />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    </ScrollArea>
  );
}
