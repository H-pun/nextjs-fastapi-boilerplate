import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { scopeKeys } from "@/lib/types/user";

/**
 * Gate for every /dashboard/admin/* route.
 *
 * Placed here rather than in the shared dashboard layout because this one only
 * mounts when the admin subtree is entered — the segment is structural, not
 * read from a header that may describe a different URL.
 *
 * Gated on the scope, never on a role name: roles are renameable from the
 * Access Control page, so matching "admin" would break the moment someone
 * edits the label.
 *
 * Scopes come from the session cookie, which is a copy taken at login. This
 * gate is about what the UI shows; the API re-checks the same scope against
 * live data on every request, and that is what actually protects the data.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !scopeKeys(session.user).has("user:manage")) {
    forbidden();
  }

  return <>{children}</>;
}
