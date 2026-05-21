import { prisma } from "@/lib/prisma";

export type TvrtkaRecord = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
  direktor: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function ensureTvrtkaDirektorColumn() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Tvrtka"
    ADD COLUMN IF NOT EXISTS "direktor" TEXT;
  `);
}
