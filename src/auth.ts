import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Change 'confirm' to 'select_account' to fix the 400 error
      authorization: { params: { prompt: "select_account", access_type: "offline", response_type: "code" } }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Optional: restrict to specific domains if needed
        // return profile.email_verified && profile.email.endsWith("@example.com")
        return true;
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role || "TENANT";
        token.id = user.id;
        token.aiTags = (user as any).aiTags;
      }
      // 處理角色切換觸發 (trigger === "update")
      if (trigger === "update") {
        if (session?.user?.role) token.role = session.user.role;
        else if (session?.role) token.role = session.role;
        if (session?.user?.aiTags) token.aiTags = session.user.aiTags;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as any).role = (token.role as any) || "TENANT";
        (session.user as any).aiTags = token.aiTags;
      }
      return session;
    },
  },
  debug: true,
});
