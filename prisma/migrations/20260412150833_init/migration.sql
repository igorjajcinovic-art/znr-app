-- CreateTable
CREATE TABLE "Tvrtka" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "naziv" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "adresa" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Radnik" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmaId" TEXT NOT NULL,
    "ime" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "aktivan" BOOLEAN NOT NULL DEFAULT true,
    "datumOdjave" DATETIME,
    "datumZaposlenja" DATETIME NOT NULL,
    "datumRodjenja" DATETIME,
    "grad" TEXT,
    "radnoMjesto" TEXT,
    "imaDozvolu" BOOLEAN NOT NULL DEFAULT false,
    "dozvolaDo" DATETIME,
    "znrOsposobljen" BOOLEAN NOT NULL DEFAULT false,
    "znrDatum" DATETIME,
    "zopOsposobljen" BOOLEAN NOT NULL DEFAULT false,
    "zopDatum" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Radnik_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "Tvrtka" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LijecnickiPregled" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmaId" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "vrsta" TEXT,
    "datum" DATETIME NOT NULL,
    "vrijediDo" DATETIME NOT NULL,
    "napomena" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LijecnickiPregled_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "Tvrtka" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrucnoOsposobljavanje" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmaId" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "vrsta" TEXT NOT NULL,
    "datum" DATETIME NOT NULL,
    "vrijediDo" DATETIME NOT NULL,
    "napomena" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StrucnoOsposobljavanje_firmaId_fkey" FOREIGN KEY ("firmaId") REFERENCES "Tvrtka" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Tvrtka_oib_key" ON "Tvrtka"("oib");

-- CreateIndex
CREATE INDEX "Radnik_firmaId_idx" ON "Radnik"("firmaId");

-- CreateIndex
CREATE UNIQUE INDEX "Radnik_firmaId_oib_key" ON "Radnik"("firmaId", "oib");

-- CreateIndex
CREATE INDEX "LijecnickiPregled_firmaId_idx" ON "LijecnickiPregled"("firmaId");

-- CreateIndex
CREATE INDEX "LijecnickiPregled_firmaId_oib_idx" ON "LijecnickiPregled"("firmaId", "oib");

-- CreateIndex
CREATE INDEX "StrucnoOsposobljavanje_firmaId_idx" ON "StrucnoOsposobljavanje"("firmaId");

-- CreateIndex
CREATE INDEX "StrucnoOsposobljavanje_firmaId_oib_idx" ON "StrucnoOsposobljavanje"("firmaId", "oib");
