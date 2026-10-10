import api from "@/app/assets/api";
import { DefaultUser } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";

interface User {
  userEmail: string;
  userName: string;
  userRole: string;
}

declare module "next-auth" {
  interface User extends DefaultUser {
    user: User;
  }
}

const handler = NextAuth({
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        userEmail: {},
        userPassword: {},
      },
      async authorize(credentials, req) {
        const response = await api.post("/auth/login", { credentials });

        if (response?.status === 200) return response.data;
        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (token) {
        session.user = token.user || user;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
