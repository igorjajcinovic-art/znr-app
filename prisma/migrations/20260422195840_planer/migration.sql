-- CreateTable
CREATE TABLE "Planer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firmaId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "opis" TEXT,
    "datum" DATETIME NOT NULL,
    "tip" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planirano',
    "radnikId" TEXT,
    "opremaId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Planer_firmaId_idx" ON "Planer"("firmaId");

-- CreateIndex
CREATE INDEX "Planer_datum_idx" ON "Planer"("datum");
