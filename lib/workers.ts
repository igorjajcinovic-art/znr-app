import { prisma } from "@/lib/prisma";

export async function ensureRadnikUlicaColumn() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Radnik"
    ADD COLUMN IF NOT EXISTS "ulica" TEXT;
  `);
}

export async function ensureRadnikKadrovskaColumns() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Radnik"
      ADD COLUMN IF NOT EXISTS "spol" TEXT,
      ADD COLUMN IF NOT EXISTS "drzavljanstvo" TEXT,
      ADD COLUMN IF NOT EXISTS "strucnoObrazovanje" TEXT,
      ADD COLUMN IF NOT EXISTS "vrstaUgovora" TEXT,
      ADD COLUMN IF NOT EXISTS "razlogPrestanka" TEXT,
      ADD COLUMN IF NOT EXISTS "prijavaOsiguranjaDatum" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "radnaDozvolaBroj" TEXT;
  `);
}
