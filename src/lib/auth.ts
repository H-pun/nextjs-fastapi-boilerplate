import CredentialsProvider from "next-auth/providers/credentials";
import axios from "@/lib/axios";
import type { AuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import type { UserData } from "@/lib/types/user";
import { exchangePathFor, oauthProviders } from "@/lib/auth-providers";

const providers: Provider[] = [
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
                    .then(({ data }) => data)
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
    ...oauthProviders.map((p) => p.build()),
];

export const authOptions: AuthOptions = {
    secret: process.env.SECRET_KEY,
    providers,
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, user, account, trigger, session }) {
            // A provider proves who someone is; it says nothing about what they
            // may do here. Trade its token for one of this app's own, so the
            // session ends up the same shape as a password login and every
            // guard downstream keeps seeing a single kind of token.
            const exchangePath = account?.provider
                ? exchangePathFor(account.provider)
                : undefined;

            if (exchangePath && account?.id_token) {
                const { data } = await axios.post<UserData>(
                    `${process.env.NEXT_PUBLIC_API_URL}${exchangePath}`,
                    { idToken: account.id_token },
                );
                token.user = data;
                return token;
            }

            if (user) token.user = user as UserData;
            if (trigger === "update" && session?.user) {
                token.user = session.user;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.user) session.user = token.user;
            return session;
        },
    },
};
