import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";

const navItems = [
  { title: "Home", href: "/" },
  { title: "Features", href: "/#features" },
];

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LandingHeader items={navItems} />
      <main className="flex-1 pt-16">{children}</main>
      <LandingFooter githubLink="https://github.com/H-pun/nextjs-fastapi-boilerplate" />
    </div>
  );
}
