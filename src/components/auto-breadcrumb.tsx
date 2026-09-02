"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
// import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { z } from "zod";

// guid, not uuid: z.uuid() enforces the RFC 9562 version and variant bits,
// which the seeded ids (11111111-1111-1111-1111-111111111001) do not carry.
// Missing one here shows a raw id in the breadcrumb instead of hiding it.
const idSchema = z.guid();
const isId = (str: string) => idSchema.safeParse(str).success;

export function AutoBreadcrumb() {
  const pathname = usePathname();
  const filteredPath = pathname
    .split("/")
    .filter((seg) => seg && seg !== "dashboard" && !isId(seg));
  const segments = filteredPath.length ? filteredPath : ["home"];
  const pathMap = segments.map((seg, idx) => ({
    label: decodeURIComponent(seg),
    href: "/" + segments.slice(0, idx + 1).join("/"),
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {pathMap.map((item, idx) => {
          const isLastIndex = idx === pathMap.length - 1;
          return (
            <React.Fragment key={idx}>
              <BreadcrumbItem className="hidden capitalize md:block">
                {!isLastIndex ? (
                  <BreadcrumbLink href="#">{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLastIndex && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
