-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Tvrtka" (
    "id" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "adresa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tvrtka_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Radnik" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "aktivan" BOOLEAN NOT NULL DEFAULT true,
    "datumOdjave" TIMESTAMP(3),
    "datumZaposlenja" TIMESTAMP(3) NOT NULL,
    "datumRodjenja" TIMESTAMP(3),
    "grad" TEXT,
    "radnoMjesto" TEXT,
    "imaDozvolu" BOOLEAN NOT NULL DEFAULT false,
    "dozvolaDo" TIMESTAMP(3),
    "znrOsposobljen" BOOLEAN NOT NULL DEFAULT false,
    "znrDatum" TIMESTAMP(3),
    "zopOsposobljen" BOOLEAN NOT NULL DEFAULT false,
    "zopDatum" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Radnik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LijecnickiPregled" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "vrsta" TEXT,
    "datum" TIMESTAMP(3) NOT NULL,
    "vrijediDo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktivno',
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LijecnickiPregled_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrucnoOsposobljavanje" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "vrsta" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "vrijediDo" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktivno',
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrucnoOsposobljavanje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oprema" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "vrsta" TEXT NOT NULL,
    "datumIzdavanja" TIMESTAMP(3) NOT NULL,
    "kolicina" INTEGER NOT NULL DEFAULT 1,
    "rokZamjene" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'aktivno',
    "napomena" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Oprema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadnaOprema" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadnaOprema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadnaOpremaDokument" (
    "id" TEXT NOT NULL,
    "radnaOpremaId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadnaOpremaDokument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planer" (
    "id" TEXT NOT NULL,
    "firmaId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,
    "datum" TIMESTAMP(3) NOT NULL,
    "tip" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planirano',
    "radnikId" TEXT,
    "opremaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "lozinkaHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tvrtka_oib_key" ON "Tvrtka"("oib");

-- CreateIndex
CREATE INDEX "Radnik_firmaId_idx" ON "Radnik"("firmaId");

-- CreateIndex
CREATE INDEX "LijecnickiPregled_firmaId_idx" ON "LijecnickiPregled"("firmaId");

-- CreateIndex
CREATE INDEX "LijecnickiPregled_firmaId_oib_idx" ON "LijecnickiPregled"("firmaId", "oib");

-- CreateIndex
CREATE INDEX "LijecnickiPregled_status_idx" ON "LijecnickiPregled"("status");

-- CreateIndex
CREATE INDEX "StrucnoOsposobljavanje_firmaId_idx" ON "StrucnoOsposobljavanje"("firmaId");

-- CreateIndex
CREATE INDEX "StrucnoOsposobljavanje_firmaId_oib_idx" ON "StrucnoOsposobljavanje"("firmaId", "oib");

-- CreateIndex
CREATE INDEX "StrucnoOsposobljavanje_status_idx" ON "StrucnoOsposobljavanje"("status");

-- CreateIndex
CREATE INDEX "Oprema_firmaId_idx" ON "Oprema"("firmaId");

-- CreateIndex
CREATE INDEX "Oprema_firmaId_oib_idx" ON "Oprema"("firmaId", "oib");

-- CreateIndex
CREATE INDEX "Oprema_status_idx" ON "Oprema"("status");

-- CreateIndex
CREATE INDEX "RadnaOprema_firmaId_idx" ON "RadnaOprema"("firmaId");

-- CreateIndex
CREATE INDEX "RadnaOprema_serijskiBroj_idx" ON "RadnaOprema"("serijskiBroj");

-- CreateIndex
CREATE INDEX "RadnaOprema_inventarniBroj_idx" ON "RadnaOprema"("inventarniBroj");

-- CreateIndex
CREATE INDEX "RadnaOprema_status_idx" ON "RadnaOprema"("status");

-- CreateIndex
CREATE INDEX "RadnaOpremaDokument_radnaOpremaId_idx" ON "RadnaOpremaDokument"("radnaOpremaId");

-- CreateIndex
CREATE INDEX "Planer_firmaId_idx" ON "Planer"("firmaId");

-- CreateIndex
CREATE INDEX "Planer_datum_idx" ON "Planer"("datum");

-- CreateIndex
CREATE INDEX "Planer_status_idx" ON "Planer"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Radnik" ADD CONSTRAINT "Radnik_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "Tvrtka"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LijecnickiPregled" ADD CONSTRAINT "LijecnickiPregled_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "Tvrtka"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrucnoOsposobljavanje" ADD CONSTRAINT "StrucnoOsposobljavanje_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "Tvrtka"("id") ON DELETE CASCADE ON UPDATE CASCADE;

