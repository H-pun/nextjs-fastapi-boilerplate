const FEATURES = [
  "Scope-based access control",
  "URL-driven admin tables",
  "Role-aware navigation",
] as const;

/** Decorative panel beside the sign-in form. Hidden from a11y tree. */
export function LoginHero() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden w-1/2 flex-none overflow-hidden rounded-3xl bg-black lg:my-4 lg:ml-4 lg:block"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,var(--primary)_0%,transparent_55%),radial-gradient(ellipse_at_85%_85%,color-mix(in_oklch,var(--primary),white_35%)_0%,transparent_50%)] opacity-90"
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
        <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both text-2xl leading-[1.35] font-medium tracking-[-0.02em] text-white duration-700 motion-reduce:animate-none">
          Every user, role, and admin view in one place.
        </p>
        <p className="animate-in fade-in slide-in-from-bottom-3 fill-mode-both mt-3 max-w-[400px] text-sm leading-relaxed text-white/75 delay-100 duration-700 motion-reduce:animate-none">
          Manage accounts, navigation, and data tables from a single dashboard
          shell.
        </p>

        <ul className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both mt-8 flex flex-col gap-3 delay-200 duration-700 motion-reduce:animate-none">
          {FEATURES.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-3 text-sm text-white/70"
            >
              <span className="size-1.5 shrink-0 rounded-full bg-white/50" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
