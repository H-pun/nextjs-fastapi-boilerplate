import KeycloakProvider from "next-auth/providers/keycloak";
import type { Provider } from "next-auth/providers/index";
import type { IconName } from "lucide-react/dynamic";

/**
 * One entry per way in, besides username and password.
 *
 * Everything about a provider lives here: whether it is configured, what
 * NextAuth needs to talk to it, what the button says, and where the backend
 * trades its token. Adding one is adding an entry — the login page reads this
 * list rather than knowing any provider by name.
 */
export interface OAuthProvider {
  /** Matches NextAuth's provider id, and the last segment of the exchange URL. */
  id: string;
  label: string;
  /** Any lucide name; rendered through `NavIcon`. */
  icon: IconName;
  /** Built only when configured — absent means this deployment does not offer it. */
  build: () => Provider;
  /**
   * Where the backend swaps the provider's token for one of its own. A provider
   * without one would leave the session holding a token no guard understands.
   */
  exchangePath: string;
}

/**
 * Providers this build knows how to offer, whether or not they are configured.
 *
 * `env` names the variables that decide it. Listing them rather than checking
 * inline keeps "is it available" answerable without running `build`.
 */
const CANDIDATES: (OAuthProvider & { env: (string | undefined)[] })[] = [
  {
    id: "keycloak",
    label: "Keycloak",
    icon: "key-round",
    exchangePath: "/api/user/login/keycloak",
    env: [
      process.env.KEYCLOAK_ISSUER,
      process.env.KEYCLOAK_CLIENT_ID,
      process.env.KEYCLOAK_CLIENT_SECRET,
    ],
    build: () =>
      KeycloakProvider({
        clientId: process.env.KEYCLOAK_CLIENT_ID!,
        clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
        issuer: process.env.KEYCLOAK_ISSUER!,
      }),
  },
];

/** The ones this deployment can actually offer. */
export const oauthProviders: OAuthProvider[] = CANDIDATES.filter((p) =>
  p.env.every(Boolean),
);

/** Where to trade a given provider's token, or undefined if it is not offered. */
export function exchangePathFor(providerId: string): string | undefined {
  return oauthProviders.find((p) => p.id === providerId)?.exchangePath;
}

/**
 * What the login page needs, without the parts that only make sense on the
 * server. `build` closes over secrets and cannot cross to the client.
 */
export type PublicProvider = Pick<OAuthProvider, "id" | "label" | "icon">;

export const publicProviders: PublicProvider[] = oauthProviders.map(
  ({ id, label, icon }) => ({ id, label, icon }),
);
