// src/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role?: "USER" | "ADMIN";
      tier?: "FREE" | "BUSINESS" | "PRO" | "AGENCY" | "STUDIO";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role?: "USER" | "ADMIN";
    tier?: "FREE" | "BUSINESS" | "PRO" | "AGENCY" | "STUDIO";
  }
}
