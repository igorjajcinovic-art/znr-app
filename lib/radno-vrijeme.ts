import { prisma } from "@/lib/prisma";

export async function ensureRadnoVrijemeTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RadnoVrijeme" (
      "id" TEXT NOT NULL,
      "firmaId" TEXT NOT NULL,
      "radnikId" TEXT,
      "oib" TEXT NOT NULL,
      "datum" TIMESTAMP(3) NOT NULL,
      "pocetak" TEXT NOT NULL,
      "kraj" TEXT NOT NULL,
      "pauzaMin" INTEGER NOT NULL DEFAULT 0,
      "ukupnoMin" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'evidentirano',
      "napomena" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RadnoVrijeme_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'RadnoVrijeme_firmaId_fkey'
      ) THEN
        ALTER TABLE "RadnoVrijeme"
        ADD CONSTRAINT "RadnoVrijeme_firmaId_fkey"
        FOREIGN KEY ("firmaId") REFERENCES "Tvrtka"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RadnoVrijeme_firmaId_idx" ON "RadnoVrijeme"("firmaId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RadnoVrijeme_firmaId_oib_idx" ON "RadnoVrijeme"("firmaId", "oib");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RadnoVrijeme_firmaId_radnikId_idx" ON "RadnoVrijeme"("firmaId", "radnikId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RadnoVrijeme_datum_idx" ON "RadnoVrijeme"("datum");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RadnoVrijeme_status_idx" ON "RadnoVrijeme"("status");
  `);
}

export function parseTimeToMinutes(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);

  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

export function calculateWorkMinutes(
  pocetak: string,
  kraj: string,
  pauzaMin: number
) {
  const start = parseTimeToMinutes(pocetak);
  const end = parseTimeToMinutes(kraj);

  if (start === null || end === null) return null;

  const raw = end >= start ? end - start : end + 24 * 60 - start;
  return Math.max(0, raw - Math.max(0, pauzaMin));
}
