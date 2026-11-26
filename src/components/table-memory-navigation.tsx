"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { rememberTableHref } from "@/hooks/use-table-memory";

/**
 * Dashboard links (sidebar, home shortcuts) are stored as a bare path. Clicking
 * one would land on `/dashboard/admin/user` for a frame, then table-memory
 * restore would write the filters — the URL and table both flash.
 *
 * Capture the click and push the remembered query instead, so the destination
 * URL is already filtered.
 */
export function TableMemoryNavigation() {
  const router = useRouter();

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

      const next = rememberTableHref(href);
      if (next === href) return;

      event.preventDefault();
      event.stopPropagation();
      router.push(next);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
