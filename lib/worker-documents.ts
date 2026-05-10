import { prisma } from "@/lib/prisma";

export type RadnikDokument = {
  id: string;
  firmaId: string;
  radnikId: string;
  naziv: string;
  tip: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  napomena: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function ensureRadnikDokumentiTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RadnikDokument" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "radnikId" TEXT NOT NULL,
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
    CREATE INDEX IF NOT EXISTS "RadnikDokument_radnikId_idx"
    ON "RadnikDokument"("radnikId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RadnikDokument_firmaId_idx"
    ON "RadnikDokument"("firmaId");
  `);
}
