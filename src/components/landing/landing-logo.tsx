import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function LandingLogo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <Image
        src="/images/logo.svg"
        alt=""
        width={24}
        height={24}
        className="size-6 dark:invert"
      />
      <span className="font-bold sm:inline-block">Boilerplate</span>
    </Link>
  );
}
