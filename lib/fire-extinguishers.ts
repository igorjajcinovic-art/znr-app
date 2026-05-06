import { prisma } from "@/lib/prisma";

export type VatrogasniAparat = {
  id: string;
  firmaId: string;
  oznaka: string;
  lokacija: string;
  vrsta: string | null;
  proizvodjac: string | null;
  tvornickiBroj: string | null;
  datumRedovnogPregleda: Date | null;
  sljedeciRedovniPregled: Date | null;
  datumPeriodicnogPregleda: Date | null;
  sljedeciPeriodicniPregled: Date | null;
  status: string;
  napomena: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type VatrogasniAparatPregled = {
  id: string;
  aparatId: string;
  firmaId: string;
  vrstaPregleda: string;
  datumPregleda: Date;
  sljedeciPregled: Date | null;
  napomena: string | null;
  createdAt: Date;
};

export async function ensureVatrogasniAparatiTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VatrogasniAparat" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "oznaka" TEXT NOT NULL,
      "lokacija" TEXT NOT NULL,
      "vrsta" TEXT,
      "proizvodjac" TEXT,
      "tvornickiBroj" TEXT,
      "datumRedovnogPregleda" TIMESTAMP,
      "sljedeciRedovniPregled" TIMESTAMP,
      "datumPeriodicnogPregleda" TIMESTAMP,
      "sljedeciPeriodicniPregled" TIMESTAMP,
      "status" TEXT NOT NULL DEFAULT 'aktivno',
      "napomena" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VatrogasniAparat_firmaId_idx"
    ON "VatrogasniAparat"("firmaId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VatrogasniAparat_status_idx"
    ON "VatrogasniAparat"("status");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VatrogasniAparat_redovni_idx"
    ON "VatrogasniAparat"("sljedeciRedovniPregled");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VatrogasniAparat_periodicni_idx"
    ON "VatrogasniAparat"("sljedeciPeriodicniPregled");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VatrogasniAparatPregled" (
      "id" TEXT PRIMARY KEY,
      "aparatId" TEXT NOT NULL,
      "firmaId" TEXT NOT NULL,
      "vrstaPregleda" TEXT NOT NULL,
      "datumPregleda" TIMESTAMP NOT NULL,
      "sljedeciPregled" TIMESTAMP,
      "napomena" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VatrogasniAparatPregled_aparatId_idx"
    ON "VatrogasniAparatPregled"("aparatId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "VatrogasniAparatPregled_firmaId_idx"
    ON "VatrogasniAparatPregled"("firmaId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "VatrogasniAparatPregled_unique_idx"
    ON "VatrogasniAparatPregled"("aparatId", "vrstaPregleda", "datumPregleda");
  `);
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (v.includes("T")) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, dd, mm, yyyy] = dots;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(
      2,
      "0"
    )}T00:00:00.000Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}
