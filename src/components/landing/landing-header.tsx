"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useState } from "react";

import { LandingLogo } from "@/components/landing/landing-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
};

function AuthButtons() {
  return (
    <Link href="/login" className={buttonVariants({ variant: "default" })}>
      Sign in
    </Link>
  );
}

function MobileNav({
  items,
  showAuthButtons,
}: {
  items: NavItem[];
  showAuthButtons: boolean;
}) {
  return (
    <div className="fixed inset-0 top-16 z-50 grid h-[calc(100vh-4rem)] grid-flow-row auto-rows-max overflow-auto p-6 pb-32 animate-in slide-in-from-bottom-80 md:hidden">
      <div className="relative z-20 grid gap-6 rounded-md bg-popover p-4 text-popover-foreground shadow-md">
        <nav className="grid grid-flow-row auto-rows-max text-sm">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex w-full items-center rounded-md p-2 text-sm font-medium hover:underline",
                item.disabled && "cursor-not-allowed opacity-60",
              )}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
            >
              {item.title}
            </Link>
          ))}
          {showAuthButtons ? (
            <div className="mt-4 flex flex-col gap-2">
              <AuthButtons />
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  );
}

function DesktopNav({ items }: { items: NavItem[] }) {
  const segment = useSelectedLayoutSegment();

  return (
    <nav className="hidden gap-6 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.disabled ? "#" : item.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-foreground/80 sm:text-sm",
            item.href.startsWith(`/${segment ?? ""}`)
              ? "text-foreground"
              : "text-foreground/60",
            item.disabled && "cursor-not-allowed opacity-80",
          )}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noreferrer" : undefined}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}

export function LandingHeader({
  items,
  showAuthButtons = true,
}: {
  items: NavItem[];
  showAuthButtons?: boolean;
}) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="fixed z-50 w-full bg-background/80 px-4 backdrop-blur md:px-8">
      <div className="flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-4 md:gap-10">
          <LandingLogo className="hidden md:flex" />

          {items.length > 0 ? <DesktopNav items={items} /> : null}

          <Button
            className="md:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setShowMobileMenu((open) => !open)}
          >
            {showMobileMenu ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>

          <LandingLogo className="md:hidden" />

          {showMobileMenu ? (
            <MobileNav items={items} showAuthButtons={showAuthButtons} />
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {showAuthButtons ? (
            <nav className="hidden items-center gap-4 md:flex">
              <AuthButtons />
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  );
}
