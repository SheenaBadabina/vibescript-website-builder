// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { compare } from "bcryptjs";
import { z } from "zod";

/**
 * Credentials schema to validate incoming form fields.
 */
const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in"
  },
  providers: [
    // Email + Password (stored as bcrypt hash in Prisma)
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name ?? null, email: user.email ?? null };
      }
    }),

    // Google sign-in (optional)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  callbacks: {
    /**
     * Attach role/tier to the JWT.
     */
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.role = dbUser?.role ?? "USER";
        token.tier = dbUser?.tier ?? "FREE";
      }
      return token;
    },
    /**
     * Reflect role/tier in the session for the client.
     */
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = (token as any).role ?? "USER";
        (session.user as any).tier = (token as any).tier ?? "FREE";
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
