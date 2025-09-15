// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

/**
 * Single Prisma client across hot reloads in dev.
 * Logs are quiet in production; verbose locally for easier debugging.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
