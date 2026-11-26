import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHero(props: {
  capsuleText: string;
  capsuleLink?: string;
  title: string;
  subtitle: string;
  credits?: React.ReactNode;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  secondaryExternal?: boolean;
}) {
  return (
    <section className="space-y-6 py-32 md:py-48 lg:py-52">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-4 text-center md:px-8">
        {props.capsuleLink ? (
          <Link
            href={props.capsuleLink}
            className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium"
          >
            {props.capsuleText}
          </Link>
        ) : (
          <span className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium">
            {props.capsuleText}
          </span>
        )}
        <h1 className="font-heading text-3xl sm:text-5xl lg:text-7xl">
          {props.title}
        </h1>
        <p className="max-w-[42rem] text-base leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          {props.subtitle}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href={props.primaryCtaLink}
            className={cn(buttonVariants({ size: "lg" }))}
          >
            {props.primaryCtaText}
          </Link>
          <Link
            href={props.secondaryCtaLink}
            target={props.secondaryExternal ? "_blank" : undefined}
            rel={props.secondaryExternal ? "noreferrer" : undefined}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            {props.secondaryCtaText}
          </Link>
        </div>
        {props.credits ? (
          <p className="mt-4 text-sm text-muted-foreground">{props.credits}</p>
        ) : null}
      </div>
    </section>
  );
}
