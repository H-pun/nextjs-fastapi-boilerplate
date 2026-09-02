"use client";

import { useSession } from "next-auth/react";

import { PageHeader } from "@/components/page-header";

export default function Page() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeader
        title={`Welcome, ${session?.user.name ?? "Admin"}`}
        description="This is your dashboard home. Add your own widgets here."
      />
    </div>
  );
}
