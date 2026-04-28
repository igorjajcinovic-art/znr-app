-- DropIndex
DROP INDEX "Radnik_firmaId_oib_key";

-- CreateTable
CREATE TABLE "Oprema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmaId" TEXT NOT NULL,
    "oib" TEXT NOT NULL,
    "vrsta" TEXT NOT NULL,
    "datumIzdavanja" DATETIME NOT NULL,
    "kolicina" INTEGER NOT NULL DEFAULT 1,
    "rokZamjene" DATETIME,
    "napomena" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
