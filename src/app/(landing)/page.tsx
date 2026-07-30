"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="relative flex min-h-svh w-full flex-col overflow-x-hidden bg-login">
      <div className="pointer-events-none absolute inset-0 bg-grid" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-8">
        <span className="text-sm font-semibold">Boilerplate</span>
        <div className="flex items-center gap-1">
          <ThemeToggle className="rounded-full hover:bg-black/5 dark:hover:bg-white/10" />
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Boilerplate
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          A starting point for role-based dashboard apps. Replace this page
          with your own landing content.
        </p>
        <Button asChild size="lg">
          <Link href="/login">Get started</Link>
        </Button>
      </main>
    </div>
  );
}
