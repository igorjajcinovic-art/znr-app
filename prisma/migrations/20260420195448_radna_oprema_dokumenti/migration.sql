-- CreateTable
CREATE TABLE "RadnaOpremaDokument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "radnaOpremaId" TEXT NOT NULL,
    "naziv" TEXT NOT NULL,
    "tip" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RadnaOpremaDokument_radnaOpremaId_idx" ON "RadnaOpremaDokument"("radnaOpremaId");

-- CreateIndex
CREATE INDEX "RadnaOprema_serijskiBroj_idx" ON "RadnaOprema"("serijskiBroj");

-- CreateIndex
CREATE INDEX "RadnaOprema_inventarniBroj_idx" ON "RadnaOprema"("inventarniBroj");
