import CredentialsProvider from "next-auth/providers/credentials";
import axios from "@/lib/axios";
import type { AuthOptions } from "next-auth";
import type { UserData } from "@/lib/types/user";

// Define custom token payload shape based on FastAPI response
interface ApiAuthResponse extends UserData {
  access_token: string;
}

function parseJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch (e) {
    return null;
  }
}

export const authOptions: AuthOptions = {
    secret: process.env.SECRET_KEY,
    providers: [
        CredentialsProvider({
            type: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) =>
                await axios
                    .post(`${process.env.NEXT_PUBLIC_API_URL}/api/user/login`, {
                        username: credentials?.username,
                        password: credentials?.password,
                    })
                    .then(({ data }) => data as ApiAuthResponse)
                    .catch((err) => {
                        if (err.response?.data?.errors?.message) {
                            throw new Error(err.response.data.errors.message);
                        } else if (err.message) {
                            throw new Error(err.message);
                        } else {
                            console.error(err);
                            throw new Error("Unexpected error occurred");
                        }
                    }),
        }),
    ],
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.user = user as UserData;
                // Extract scopes and role from the access token
                if (token.user.accessToken) {
                    const parsed = parseJwt(token.user.accessToken);
                    if (parsed) {
                        token.scopes = parsed.scopes || [];
                        token.role = parsed.role || "";
                    }
                }
            }
            if (trigger === "update" && session?.user) {
                token.user = session.user;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.user) {
                session.user = token.user as UserData;
                session.scopes = (token.scopes as string[]) || [];
                session.role = (token.role as string) || "";
            }
            return session;
        },
    },
};
