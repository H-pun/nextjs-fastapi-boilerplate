import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { publicProviders } from "@/lib/auth-providers";
import { LoginForm } from "./_components/login-form";
import { LoginHero } from "./_components/login-hero";
import { ThemeMenu } from "./_components/theme-menu";

export const metadata: Metadata = {
  title: "Sign in — Boilerplate",
};

const GITHUB_REPO = "https://github.com/H-pun/nextjs-fastapi-boilerplate";

/** Only allow same-origin paths, so `?callbackUrl=https://evil.com` can't redirect off-site. */
const resolveCallbackUrl = (url: string | string[] | undefined) =>
  typeof url === "string" && url.startsWith("/") && !url.startsWith("//")
    ? url
    : "/dashboard";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const callbackUrl = resolveCallbackUrl((await searchParams).callbackUrl);

  return (
    <div className="bg-background flex min-h-screen flex-col lg:flex-row">
      <LoginHero />

      <div className="flex flex-1 flex-col px-6 py-8 sm:px-12 lg:px-16 lg:py-10">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.svg"
              alt=""
              width={28}
              height={28}
              className="size-7 dark:invert"
            />
            <span className="text-sm font-semibold">Boilerplate</span>
          </Link>
          <ThemeMenu />
        </header>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[352px]">
            <h1 className="text-foreground text-3xl leading-[1.2] font-semibold tracking-[-0.02em]">
              Sign in to Boilerplate
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Use your account credentials to continue.
            </p>

            <LoginForm
              callbackUrl={callbackUrl}
              providers={publicProviders}
            />
          </div>
        </div>

        <footer className="text-muted-foreground flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Boilerplate</span>
          <Link
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            View on GitHub
          </Link>
        </footer>
      </div>
    </div>
  );
}
