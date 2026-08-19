import { prisma } from "@/lib/prisma";

async function run(sql: string) {
  await prisma.$executeRawUnsafe(sql);
}

export async function ensureApplicationTables() {
  await run(`
    CREATE TABLE IF NOT EXISTS "Tvrtka" (
      "id" TEXT PRIMARY KEY,
      "naziv" TEXT NOT NULL,
      "oib" TEXT NOT NULL,
      "adresa" TEXT,
      "direktor" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`ALTER TABLE "Tvrtka" ADD COLUMN IF NOT EXISTS "adresa" TEXT;`);
  await run(`ALTER TABLE "Tvrtka" ADD COLUMN IF NOT EXISTS "direktor" TEXT;`);
  await run(`CREATE INDEX IF NOT EXISTS "Tvrtka_oib_idx" ON "Tvrtka"("oib");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "Radnik" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "ime" TEXT NOT NULL,
      "oib" TEXT NOT NULL,
      "aktivan" BOOLEAN NOT NULL DEFAULT true,
      "datumOdjave" TIMESTAMP(3),
      "datumZaposlenja" TIMESTAMP(3) NOT NULL,
      "datumRodjenja" TIMESTAMP(3),
      "grad" TEXT,
      "ulica" TEXT,
      "radnoMjesto" TEXT,
      "imaDozvolu" BOOLEAN NOT NULL DEFAULT false,
      "dozvolaDo" TIMESTAMP(3),
      "znrOsposobljen" BOOLEAN NOT NULL DEFAULT false,
      "znrDatum" TIMESTAMP(3),
      "zopOsposobljen" BOOLEAN NOT NULL DEFAULT false,
      "zopDatum" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "aktivan" BOOLEAN NOT NULL DEFAULT true;`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "datumOdjave" TIMESTAMP(3);`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "datumRodjenja" TIMESTAMP(3);`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "grad" TEXT;`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "ulica" TEXT;`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "radnoMjesto" TEXT;`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "imaDozvolu" BOOLEAN NOT NULL DEFAULT false;`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "dozvolaDo" TIMESTAMP(3);`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "znrOsposobljen" BOOLEAN NOT NULL DEFAULT false;`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "znrDatum" TIMESTAMP(3);`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "zopOsposobljen" BOOLEAN NOT NULL DEFAULT false;`);
  await run(`ALTER TABLE "Radnik" ADD COLUMN IF NOT EXISTS "zopDatum" TIMESTAMP(3);`);
  await run(`CREATE INDEX IF NOT EXISTS "Radnik_firmaId_idx" ON "Radnik"("firmaId");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "LijecnickiPregled" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "oib" TEXT NOT NULL,
      "vrsta" TEXT,
      "datum" TIMESTAMP(3) NOT NULL,
      "vrijediDo" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'aktivno',
      "napomena" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`ALTER TABLE "LijecnickiPregled" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'aktivno';`);
  await run(`CREATE INDEX IF NOT EXISTS "LijecnickiPregled_firmaId_idx" ON "LijecnickiPregled"("firmaId");`);
  await run(`CREATE INDEX IF NOT EXISTS "LijecnickiPregled_firmaId_oib_idx" ON "LijecnickiPregled"("firmaId", "oib");`);
  await run(`CREATE INDEX IF NOT EXISTS "LijecnickiPregled_status_idx" ON "LijecnickiPregled"("status");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "StrucnoOsposobljavanje" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "oib" TEXT NOT NULL,
      "vrsta" TEXT NOT NULL,
      "datum" TIMESTAMP(3) NOT NULL,
      "vrijediDo" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'aktivno',
      "napomena" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`ALTER TABLE "StrucnoOsposobljavanje" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'aktivno';`);
  await run(`CREATE INDEX IF NOT EXISTS "StrucnoOsposobljavanje_firmaId_idx" ON "StrucnoOsposobljavanje"("firmaId");`);
  await run(`CREATE INDEX IF NOT EXISTS "StrucnoOsposobljavanje_firmaId_oib_idx" ON "StrucnoOsposobljavanje"("firmaId", "oib");`);
  await run(`CREATE INDEX IF NOT EXISTS "StrucnoOsposobljavanje_status_idx" ON "StrucnoOsposobljavanje"("status");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "Oprema" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "oib" TEXT NOT NULL,
      "vrsta" TEXT NOT NULL,
      "datumIzdavanja" TIMESTAMP(3) NOT NULL,
      "kolicina" INTEGER NOT NULL DEFAULT 1,
      "rokZamjene" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'aktivno',
      "napomena" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`ALTER TABLE "Oprema" ADD COLUMN IF NOT EXISTS "kolicina" INTEGER NOT NULL DEFAULT 1;`);
  await run(`ALTER TABLE "Oprema" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'aktivno';`);
  await run(`CREATE INDEX IF NOT EXISTS "Oprema_firmaId_idx" ON "Oprema"("firmaId");`);
  await run(`CREATE INDEX IF NOT EXISTS "Oprema_firmaId_oib_idx" ON "Oprema"("firmaId", "oib");`);
  await run(`CREATE INDEX IF NOT EXISTS "Oprema_status_idx" ON "Oprema"("status");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "RadnaOprema" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "naziv" TEXT NOT NULL,
      "tip" TEXT NOT NULL,
      "serijskiBroj" TEXT,
      "inventarniBroj" TEXT,
      "proizvodjac" TEXT,
      "model" TEXT,
      "datumNabave" TIMESTAMP(3),
      "datumServisa" TIMESTAMP(3),
      "sljedeciServis" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'aktivno',
      "napomena" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS "RadnaOprema_firmaId_idx" ON "RadnaOprema"("firmaId");`);
  await run(`CREATE INDEX IF NOT EXISTS "RadnaOprema_serijskiBroj_idx" ON "RadnaOprema"("serijskiBroj");`);
  await run(`CREATE INDEX IF NOT EXISTS "RadnaOprema_inventarniBroj_idx" ON "RadnaOprema"("inventarniBroj");`);
  await run(`CREATE INDEX IF NOT EXISTS "RadnaOprema_status_idx" ON "RadnaOprema"("status");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "RadnaOpremaDokument" (
      "id" TEXT PRIMARY KEY,
      "radnaOpremaId" TEXT NOT NULL,
      "naziv" TEXT NOT NULL,
      "tip" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileUrl" TEXT NOT NULL,
      "mimeType" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS "RadnaOpremaDokument_radnaOpremaId_idx" ON "RadnaOpremaDokument"("radnaOpremaId");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "Planer" (
      "id" TEXT PRIMARY KEY,
      "firmaId" TEXT NOT NULL,
      "naziv" TEXT NOT NULL,
      "opis" TEXT,
      "datum" TIMESTAMP(3) NOT NULL,
      "tip" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'planirano',
      "radnikId" TEXT,
      "opremaId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS "Planer_firmaId_idx" ON "Planer"("firmaId");`);
  await run(`CREATE INDEX IF NOT EXISTS "Planer_datum_idx" ON "Planer"("datum");`);
  await run(`CREATE INDEX IF NOT EXISTS "Planer_status_idx" ON "Planer"("status");`);

  await run(`
    CREATE TABLE IF NOT EXISTS "RadnoVrijeme" (
      "id" TEXT PRIMARY KEY,
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
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await run(`CREATE INDEX IF NOT EXISTS "RadnoVrijeme_firmaId_idx" ON "RadnoVrijeme"("firmaId");`);
  await run(`CREATE INDEX IF NOT EXISTS "RadnoVrijeme_firmaId_oib_idx" ON "RadnoVrijeme"("firmaId", "oib");`);
  await run(`CREATE INDEX IF NOT EXISTS "RadnoVrijeme_firmaId_radnikId_idx" ON "RadnoVrijeme"("firmaId", "radnikId");`);
  await run(`CREATE INDEX IF NOT EXISTS "RadnoVrijeme_datum_idx" ON "RadnoVrijeme"("datum");`);
  await run(`CREATE INDEX IF NOT EXISTS "RadnoVrijeme_status_idx" ON "RadnoVrijeme"("status");`);
}
