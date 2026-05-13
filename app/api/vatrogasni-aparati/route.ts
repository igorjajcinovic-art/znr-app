import { randomUUID } from "crypto";
import {
  addMonths,
  addYears,
  ensureVatrogasniAparatiTable,
  parseDate,
  type VatrogasniAparat,
} from "@/lib/fire-extinguishers";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await ensureVatrogasniAparatiTable();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    const data = firmaId
      ? await prisma.$queryRaw<VatrogasniAparat[]>`
          SELECT * FROM "VatrogasniAparat"
          WHERE "firmaId" = ${firmaId}
          ORDER BY "sljedeciRedovniPregled" ASC NULLS LAST, "oznaka" ASC
        `
      : await prisma.$queryRaw<VatrogasniAparat[]>`
          SELECT * FROM "VatrogasniAparat"
          ORDER BY "sljedeciRedovniPregled" ASC NULLS LAST, "oznaka" ASC
        `;

    return Response.json(data);
  } catch (error) {
    console.error("GET /api/vatrogasni-aparati error:", error);
    return new Response("Ne mogu učitati vatrogasne aparate.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureVatrogasniAparatiTable();

    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const oznaka = String(body?.oznaka ?? "").trim();
    const lokacija = String(body?.lokacija ?? "").trim();
    const status = String(body?.status ?? "aktivno").trim() || "aktivno";

    if (!firmaId || !oznaka || !lokacija) {
      return new Response("Oznaka, lokacija i tvrtka su obavezni.", {
        status: 400,
      });
    }

    const postojeci = await prisma.$queryRaw<VatrogasniAparat[]>`
      SELECT * FROM "VatrogasniAparat"
      WHERE "firmaId" = ${firmaId}
        AND LOWER("oznaka") = LOWER(${oznaka})
      LIMIT 1
    `;

    if (postojeci[0]) {
      return new Response("Vatrogasni aparat s tom oznakom već postoji.", {
        status: 409,
      });
    }

    const datumRedovnogPregleda = parseDate(body?.datumRedovnogPregleda);
    const sljedeciRedovniPregled =
      parseDate(body?.sljedeciRedovniPregled) ||
      (datumRedovnogPregleda ? addMonths(datumRedovnogPregleda, 3) : null);

    const datumPeriodicnogPregleda = parseDate(body?.datumPeriodicnogPregleda);
    const sljedeciPeriodicniPregled =
      parseDate(body?.sljedeciPeriodicniPregled) ||
      (datumPeriodicnogPregleda ? addYears(datumPeriodicnogPregleda, 1) : null);

    const id = randomUUID();

    const rows = await prisma.$queryRaw<VatrogasniAparat[]>`
      INSERT INTO "VatrogasniAparat" (
        "id",
        "firmaId",
        "oznaka",
        "lokacija",
        "vrsta",
        "proizvodjac",
        "tvornickiBroj",
        "datumRedovnogPregleda",
        "sljedeciRedovniPregled",
        "datumPeriodicnogPregleda",
        "sljedeciPeriodicniPregled",
        "status",
        "napomena",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${firmaId},
        ${oznaka},
        ${lokacija},
        ${body?.vrsta ? String(body.vrsta).trim() : null},
        ${body?.proizvodjac ? String(body.proizvodjac).trim() : null},
        ${body?.tvornickiBroj ? String(body.tvornickiBroj).trim() : null},
        ${datumRedovnogPregleda},
        ${sljedeciRedovniPregled},
        ${datumPeriodicnogPregleda},
        ${sljedeciPeriodicniPregled},
        ${status},
        ${body?.napomena ? String(body.napomena).trim() : null},
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    if (datumRedovnogPregleda) {
      await prisma.$executeRaw`
        INSERT INTO "VatrogasniAparatPregled" (
          "id",
          "aparatId",
          "firmaId",
          "vrstaPregleda",
          "datumPregleda",
          "sljedeciPregled"
        )
        VALUES (
          ${randomUUID()},
          ${id},
          ${firmaId},
          ${"redovni"},
          ${datumRedovnogPregleda},
          ${sljedeciRedovniPregled}
        )
        ON CONFLICT ("aparatId", "vrstaPregleda", "datumPregleda") DO NOTHING
      `;
    }

    if (datumPeriodicnogPregleda) {
      await prisma.$executeRaw`
        INSERT INTO "VatrogasniAparatPregled" (
          "id",
          "aparatId",
          "firmaId",
          "vrstaPregleda",
          "datumPregleda",
          "sljedeciPregled"
        )
        VALUES (
          ${randomUUID()},
          ${id},
          ${firmaId},
          ${"periodicni"},
          ${datumPeriodicnogPregleda},
          ${sljedeciPeriodicniPregled}
        )
        ON CONFLICT ("aparatId", "vrstaPregleda", "datumPregleda") DO NOTHING
      `;
    }

    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/vatrogasni-aparati error:", error);
    return new Response("Ne mogu spremiti vatrogasni aparat.", { status: 500 });
  }
}
