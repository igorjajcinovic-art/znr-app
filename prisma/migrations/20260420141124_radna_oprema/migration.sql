-- CreateTable
CREATE TABLE "RadnaOprema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmaId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "serijskiBroj" TEXT,
    "inventarniBroj" TEXT,
    "proizvodjac" TEXT,
    "model" TEXT,
    "datumNabave" DATETIME,
    "datumServisa" DATETIME,
    "sljedeciServis" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'aktivno',
    "napomena" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RadnaOprema_firmaId_idx" ON "RadnaOprema"("firmaId");
