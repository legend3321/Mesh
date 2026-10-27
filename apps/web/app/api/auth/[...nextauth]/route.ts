import api from "@/app/assets/api";
import { DefaultUser } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";

interface User {
  userId?: string;
  userEmail: string;
  userName: string;
  userRole: string;
  companyId?: string | null;
  companyGroupId?: string | null;
  company?: any;
  companyGroup?: any;
}

declare module "next-auth" {
  interface User extends DefaultUser {
    user: User;
    companyId?: string | null;
    companyGroupId?: string | null;
    company?: any;
    companyGroup?: any;
    authToken?: string;
  }
  interface Session {
    user: {
      id?: string;
      userId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      userRole?: string;
      companyId?: string | null;
      companyGroupId?: string | null;
      company?: any;
      companyGroup?: any;
    };
    authToken?: string;
  }
}

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || "mesh_nextauth_secret_key_12345",
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
        try {
          const response = await api.post("/auth/login", { credentials });
          if (response?.status === 200 && response.data?.user) {
            return {
              ...response.data.user,
              id: response.data.user.userId,
              name: response.data.user.userName,
              email: response.data.user.userEmail,
              userRole: response.data.user.userRole,
              companyId: response.data.user.companyId,
              companyGroupId: response.data.user.companyGroupId,
              company: response.data.user.company,
              companyGroup: response.data.user.companyGroup,
              authToken: response.data.authToken,
            };
          }
          return null;
        } catch (e) {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
        token.authToken = (user as any).authToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = (token.user as any) || session.user;
        (session as any).authToken = token.authToken;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
