import CredentialsProvider from "next-auth/providers/credentials";
import axios from "@/lib/axios";
import type { AuthOptions } from "next-auth";
import type { UserData } from "@/lib/types/user";

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
