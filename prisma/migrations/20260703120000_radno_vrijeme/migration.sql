CREATE TABLE "RadnoVrijeme" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RadnoVrijeme_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RadnoVrijeme"
ADD CONSTRAINT "RadnoVrijeme_firmaId_fkey"
FOREIGN KEY ("firmaId") REFERENCES "Tvrtka"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RadnoVrijeme_firmaId_idx" ON "RadnoVrijeme"("firmaId");
CREATE INDEX "RadnoVrijeme_firmaId_oib_idx" ON "RadnoVrijeme"("firmaId", "oib");
CREATE INDEX "RadnoVrijeme_firmaId_radnikId_idx" ON "RadnoVrijeme"("firmaId", "radnikId");
CREATE INDEX "RadnoVrijeme_datum_idx" ON "RadnoVrijeme"("datum");
CREATE INDEX "RadnoVrijeme_status_idx" ON "RadnoVrijeme"("status");
