"use client"

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="bg-login flex h-screen w-full flex-col items-center justify-center gap-4 text-center">
      <ShieldX className="h-16 w-16 text-destructive" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Access Forbidden</h1>
        <p className="text-muted-foreground text-sm">
          You don&apos;t have permission to access this page.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
