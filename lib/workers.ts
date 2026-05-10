import { prisma } from "@/lib/prisma";

export async function ensureRadnikUlicaColumn() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Radnik"
    ADD COLUMN IF NOT EXISTS "ulica" TEXT;
  `);
}
