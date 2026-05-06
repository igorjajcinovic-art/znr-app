import { randomUUID } from "crypto";
import {
  addMonths,
  addYears,
  ensureVatrogasniAparatiTable,
  parseDate,
  type VatrogasniAparat,
  type VatrogasniAparatPregled,
} from "@/lib/fire-extinguishers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureVatrogasniAparatiTable();

    const { id } = await params;

    const pregledi = await prisma.$queryRaw<VatrogasniAparatPregled[]>`
      SELECT * FROM "VatrogasniAparatPregled"
      WHERE "aparatId" = ${id}
      ORDER BY "datumPregleda" DESC, "createdAt" DESC
    `;

    return Response.json(pregledi);
  } catch (error) {
    console.error("GET /api/vatrogasni-aparati/[id]/pregledi error:", error);
    return new Response("Ne mogu učitati povijest pregleda aparata.", {
      status: 500,
    });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureVatrogasniAparatiTable();

    const { id } = await params;
    const body = await req.json();
    const vrstaPregleda = String(body?.vrstaPregleda ?? "redovni").trim();
    const datumPregleda = parseDate(body?.datumPregleda) || new Date();
    const napomena = body?.napomena ? String(body.napomena).trim() : null;

    if (!["redovni", "periodicni"].includes(vrstaPregleda)) {
      return new Response("Vrsta pregleda nije ispravna.", { status: 400 });
    }

    const aparati = await prisma.$queryRaw<VatrogasniAparat[]>`
      SELECT * FROM "VatrogasniAparat"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const aparat = aparati[0];

    if (!aparat) {
      return new Response("Vatrogasni aparat nije pronađen.", { status: 404 });
    }

    const sljedeciPregled =
      vrstaPregleda === "redovni"
        ? addMonths(datumPregleda, 3)
        : addYears(datumPregleda, 1);

    await prisma.$executeRaw`
      INSERT INTO "VatrogasniAparatPregled" (
        "id",
        "aparatId",
        "firmaId",
        "vrstaPregleda",
        "datumPregleda",
        "sljedeciPregled",
        "napomena"
      )
      VALUES (
        ${randomUUID()},
        ${aparat.id},
        ${aparat.firmaId},
        ${vrstaPregleda},
        ${datumPregleda},
        ${sljedeciPregled},
        ${napomena}
      )
      ON CONFLICT ("aparatId", "vrstaPregleda", "datumPregleda") DO UPDATE
      SET
        "sljedeciPregled" = EXCLUDED."sljedeciPregled",
        "napomena" = EXCLUDED."napomena"
    `;

    if (vrstaPregleda === "redovni") {
      await prisma.$executeRaw`
        UPDATE "VatrogasniAparat"
        SET
          "datumRedovnogPregleda" = ${datumPregleda},
          "sljedeciRedovniPregled" = ${sljedeciPregled},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${aparat.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "VatrogasniAparat"
        SET
          "datumPeriodicnogPregleda" = ${datumPregleda},
          "sljedeciPeriodicniPregled" = ${sljedeciPregled},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${aparat.id}
      `;
    }

    const pregledi = await prisma.$queryRaw<VatrogasniAparatPregled[]>`
      SELECT * FROM "VatrogasniAparatPregled"
      WHERE "aparatId" = ${aparat.id}
      ORDER BY "datumPregleda" DESC, "createdAt" DESC
    `;

    return Response.json(pregledi[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/vatrogasni-aparati/[id]/pregledi error:", error);
    return new Response("Ne mogu evidentirati pregled vatrogasnog aparata.", {
      status: 500,
    });
  }
}
