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
      authorization: { params: { prompt: "select_account", access_type: "offline", response_type: "code" } },
      checks: ["pkce", "state"], // Bypass NextAuth v5 strict OpenID issuer missing validation bug!
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
      // Real-time Database Session Synchronizer (hides lag!)
      if (trigger === "update" && token.id) {
        const latestUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, aiTags: true }
        });
        if (latestUser) {
          token.role = latestUser.role;
          token.aiTags = latestUser.aiTags;
          console.log(`[NextAuth Session Sync] Successfully synchronized latest user ${token.id} aiTags from DB!`);
        }
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
