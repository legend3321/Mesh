import api from "@/app/assets/api";
import { DefaultUser } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import AzureADProvider from "next-auth/providers/azure-ad";
import OktaProvider from "next-auth/providers/okta";
import {
  EnterpriseSsoProfile,
  mapEnterpriseGroupsToRole,
  extractDomainFromEmail,
} from "@/lib/sso";

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
    user?: User;
    userId?: string;
    userEmail?: string;
    userName?: string;
    userRole?: string;
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
      userEmail?: string;
      userName?: string;
      image?: string | null;
      userRole?: string;
      companyId?: string | null;
      companyGroupId?: string | null;
      company?: any;
      companyGroup?: any;
      authToken?: string;
    };
    authToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: any;
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
    // 1. Standard Credentials Provider
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
              userId: response.data.user.userId,
              name: response.data.user.userName,
              userName: response.data.user.userName,
              email: response.data.user.userEmail,
              userEmail: response.data.user.userEmail,
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

    // 2. Microsoft Entra ID (Azure AD) Enterprise OIDC Provider
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || "mock-azure-client-id",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "mock-azure-client-secret",
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
    }),

    // 3. Okta Enterprise Provider
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID || "mock-okta-client-id",
      clientSecret: process.env.OKTA_CLIENT_SECRET || "mock-okta-client-secret",
      issuer: process.env.OKTA_ISSUER || "https://mesh.okta.com/oauth2/default",
    }),

    // 4. SAML 2.0 / Enterprise OIDC Provider Interface
    {
      id: "saml",
      name: "Corporate SAML 2.0",
      type: "oauth",
      version: "2.0",
      wellKnown:
        process.env.SAML_OIDC_WELL_KNOWN ||
        "https://mesh.okta.com/oauth2/default/.well-known/openid-configuration",
      authorization: { params: { scope: "openid email profile" } },
      idToken: true,
      clientId: process.env.SAML_CLIENT_ID || "mock-saml-client-id",
      clientSecret: process.env.SAML_CLIENT_SECRET || "mock-saml-client-secret",
      profile(profile: any) {
        return {
          id: profile.sub || profile.id,
          name: profile.name,
          email: profile.email || profile.preferred_username || profile.upn,
          image: null,
          groups: profile.groups || profile.roles || profile.wids || profile.ext_groups || [],
        };
      },
    } as any,
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },

    async jwt({ token, user, account, profile }) {
      // Just-In-Time (JIT) provisioning for Enterprise SSO (Okta, Azure AD, SAML 2.0)
      if (account && account.provider !== "credentials") {
        try {
          const profileAny = (profile as EnterpriseSsoProfile) || {};
          const userAny = (user as any) || {};

          // Extract enterprise profile claims
          const email = (
            user?.email ||
            profileAny.email ||
            profileAny.preferred_username ||
            profileAny.upn ||
            ""
          ).trim().toLowerCase();

          const name =
            user?.name ||
            profileAny.name ||
            (profileAny.given_name && profileAny.family_name
              ? `${profileAny.given_name} ${profileAny.family_name}`
              : "") ||
            (email ? email.split("@")[0] : "Corporate SSO User");

          // Extract enterprise group and role claims (groups, roles, wids, ext_groups)
          const extractedGroups: string[] = [];
          const collectClaims = (claimSource: any) => {
            if (!claimSource) return;
            if (Array.isArray(claimSource)) {
              claimSource.forEach((item) => {
                if (typeof item === "string" && item.trim()) {
                  extractedGroups.push(item.trim());
                }
              });
            } else if (typeof claimSource === "string" && claimSource.trim()) {
              extractedGroups.push(claimSource.trim());
            }
          };

          collectClaims(profileAny.groups);
          collectClaims(profileAny.roles);
          collectClaims(profileAny.wids);
          collectClaims(profileAny.ext_groups);
          collectClaims(userAny.groups);
          collectClaims(userAny.roles);

          // Domain to tenant mapping
          const corporateDomain = extractDomainFromEmail(email);

          // Securely trigger JIT user provisioning via API call
          const response = await api.post("/auth/sso/provision", {
            email,
            name,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            groups: extractedGroups,
            corporateDomain,
          });

          if (response?.status >= 200 && response?.status < 300 && response.data?.user) {
            const provisioned = response.data.user;
            const authToken = response.data.authToken;

            token.user = {
              ...provisioned,
              userId: provisioned.userId || provisioned.id,
              userEmail: provisioned.userEmail || provisioned.email,
              userName: provisioned.userName || provisioned.name,
              userRole: provisioned.userRole,
              companyId: provisioned.companyId,
              companyGroupId: provisioned.companyGroupId,
              company: provisioned.company,
              companyGroup: provisioned.companyGroup,
              authToken: authToken,
            };
            token.authToken = authToken;
          }
        } catch (ssoError: any) {
          console.error(
            "SSO JIT Provisioning failed in NextAuth jwt callback:",
            ssoError?.response?.data || ssoError?.message || ssoError
          );
        }
      } else if (user) {
        // Standard credentials login
        token.user = user;
        token.authToken = (user as any).authToken;
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        const u = (token.user as any) || session.user;
        const authToken = token.authToken || u?.authToken;
        session.user = {
          ...u,
          id: u?.userId || u?.id || session.user?.id,
          userId: u?.userId || u?.id,
          name: u?.userName || u?.name || session.user?.name,
          userName: u?.userName || u?.name,
          email: u?.userEmail || u?.email || session.user?.email,
          userEmail: u?.userEmail || u?.email,
          userRole: u?.userRole,
          companyId: u?.companyId,
          companyGroupId: u?.companyGroupId,
          company: u?.company,
          companyGroup: u?.companyGroup,
          authToken: authToken,
        };
        (session as any).authToken = authToken;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
