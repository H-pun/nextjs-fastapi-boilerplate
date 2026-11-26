"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LayoutDashboard, Signpost, User, Users } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { hasAdminScope } from "@/lib/types/user";

const ADMIN_SHORTCUTS = [
  {
    title: "Users",
    description: "Manage accounts and roles.",
    href: "/dashboard/admin/user",
    icon: Users,
  },
  {
    title: "Navigation",
    description: "Configure sidebar menus.",
    href: "/dashboard/admin/navigation",
    icon: Signpost,
  },
  {
    title: "Profile",
    description: "Update your account settings.",
    href: "/dashboard/profile",
    icon: User,
  },
] as const;

const USER_SHORTCUTS = [
  {
    title: "Profile",
    description: "Update your account settings.",
    href: "/dashboard/profile",
    icon: User,
  },
] as const;

export default function Page() {
  const { data: session } = useSession();
  const shortcuts = hasAdminScope(session?.user)
    ? ADMIN_SHORTCUTS
    : USER_SHORTCUTS;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title={`Welcome, ${session?.user.name ?? "there"}`}
        description="Your dashboard home. Add widgets here as you build out your product."
      />

      <Empty className="min-h-72 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutDashboard />
          </EmptyMedia>
          <EmptyTitle>No widgets yet</EmptyTitle>
          <EmptyDescription>
            This boilerplate leaves the home page blank on purpose. Drop in
            charts, stats, or recent activity when you are ready.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href={shortcuts[0].href}>Go to {shortcuts[0].title.toLowerCase()}</Link>
          </Button>
        </EmptyContent>
      </Empty>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} href={href} className="group block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader className="gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-4" />
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
