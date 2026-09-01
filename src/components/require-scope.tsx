"use client";

import { useSession } from "next-auth/react";

import { scopeKeys } from "@/lib/types/user";

/**
 * Show children only when the signed-in user holds every listed scope.
 *
 * For hiding UI — a button that would only ever return 403, a column nobody
 * else may read. It is not a security boundary: the markup is decided in the
 * browser, and the scopes come from the session cookie rather than the
 * database. Whatever the hidden control calls must check the scope itself.
 */
export function RequireScope({
  scopes,
  children,
  fallback = null,
}: {
  scopes: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  // Render nothing while loading, so a control cannot flash into view and then
  // disappear once the session arrives.
  if (status === "loading") return <>{fallback}</>;

  const required = Array.isArray(scopes) ? scopes : [scopes];
  const held = scopeKeys(session?.user);

  return required.every((scope) => held.has(scope)) ? (
    <>{children}</>
  ) : (
    <>{fallback}</>
  );
}

/** Same check without the wrapper, for conditions inside a component. */
export function useScopes() {
  const { data: session } = useSession();
  const held = scopeKeys(session?.user);
  return {
    has: (scope: string) => held.has(scope),
    hasAll: (...scopes: string[]) => scopes.every((s) => held.has(s)),
  };
}
