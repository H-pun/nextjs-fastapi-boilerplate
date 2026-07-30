"use client";

import { useSession } from "next-auth/react";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome, {session?.user.name ?? "User"}
          </h1>
          <p className="text-sm text-muted-foreground">
            This is your dashboard home. Add your own widgets here.
          </p>
        </div>
      </div>

      <Separator />
    </div>
  );
}
