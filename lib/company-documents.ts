import { prisma } from "@/lib/prisma";

export type TvrtkaDokument = {
  id: string;
  firmaId: string;
  naziv: string;
  tip: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  napomena: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function ensureTvrtkaDokumentiTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TvrtkaDokument" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "naziv" TEXT NOT NULL,
      "tip" TEXT NOT NULL DEFAULT 'ostalo',
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "mimeType" TEXT,
      "napomena" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TvrtkaDokument_firmaId_idx"
    ON "TvrtkaDokument"("firmaId");
  `);
}