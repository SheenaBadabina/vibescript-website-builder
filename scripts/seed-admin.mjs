// scripts/seed-admin.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env");
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        role: "ADMIN",
        tier: "STUDIO",
        passwordHash
      }
    });
    console.log("✅ Updated existing admin account.");
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        role: "ADMIN",
        tier: "STUDIO",
        passwordHash
      }
    });
    console.log("✅ Created new admin account.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
