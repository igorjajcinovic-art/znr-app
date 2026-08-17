import { prisma } from "@/lib/prisma";

export async function ensureUserTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT NOT NULL,
      "ime" TEXT NOT NULL,
      "lozinkaHash" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'admin',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ime" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lozinkaHash" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'admin';`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;`);

  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    `);
  } catch (error) {
    console.warn("User email index could not be ensured:", error);
  }
}