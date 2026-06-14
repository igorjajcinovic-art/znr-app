import { randomUUID } from "crypto";
import {
  addMonths,
  addYears,
  ensureVatrogasniAparatiTable,
  parseDate,
  type VatrogasniAparat,
} from "@/lib/fire-extinguishers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await ensureVatrogasniAparatiTable();

    const body = await req.json();
    const firmaId = String(body?.firmaId ?? "").trim();
    const vrstaPregleda = String(body?.vrstaPregleda ?? "redovni").trim();
    const datumPregleda = parseDate(body?.datumPregleda);
    const napomena = body?.napomena ? String(body.napomena).trim() : null;
    const rawAparatIds: unknown[] | null = Array.isArray(body?.aparatIds)
      ? body.aparatIds
      : null;
    const aparatIds =
      rawAparatIds?.map((id: unknown) => String(id).trim()).filter(Boolean) ||
      null;

    if (!firmaId) {
      return new Response("Nedostaje tvrtka.", { status: 400 });
    }

    if (!["redovni", "periodicni"].includes(vrstaPregleda)) {
      return new Response("Vrsta pregleda nije ispravna.", { status: 400 });
    }

    if (!datumPregleda) {
      return new Response("Datum pregleda nije ispravan.", { status: 400 });
    }

    if (rawAparatIds && !aparatIds?.length) {
      return new Response("Odaberi barem jedan vatrogasni aparat.", {
        status: 400,
      });
    }

    const sviAparati = await prisma.$queryRaw<VatrogasniAparat[]>`
      SELECT * FROM "VatrogasniAparat"
      WHERE "firmaId" = ${firmaId}
      ORDER BY "oznaka" ASC
    `;

    const aparatIdSet = aparatIds ? new Set(aparatIds) : null;
    const aparati = aparatIdSet
      ? sviAparati.filter((aparat) => aparatIdSet.has(aparat.id))
      : sviAparati;

    if (!aparati.length) {
      return Response.json({ ok: true, updated: 0 });
    }

    const sljedeciPregled =
      vrstaPregleda === "redovni"
        ? addMonths(datumPregleda, 3)
        : addYears(datumPregleda, 1);

    const operations = aparati.flatMap((aparat) => {
      const updateOperation =
        vrstaPregleda === "redovni"
          ? prisma.$executeRaw`
              UPDATE "VatrogasniAparat"
              SET
                "datumRedovnogPregleda" = ${datumPregleda},
                "sljedeciRedovniPregled" = ${sljedeciPregled},
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE "id" = ${aparat.id}
            `
          : prisma.$executeRaw`
              UPDATE "VatrogasniAparat"
              SET
                "datumPeriodicnogPregleda" = ${datumPregleda},
                "sljedeciPeriodicniPregled" = ${sljedeciPregled},
                "updatedAt" = CURRENT_TIMESTAMP
              WHERE "id" = ${aparat.id}
            `;

      return [
        prisma.$executeRaw`
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
            ${firmaId},
            ${vrstaPregleda},
            ${datumPregleda},
            ${sljedeciPregled},
            ${napomena}
          )
          ON CONFLICT ("aparatId", "vrstaPregleda", "datumPregleda") DO UPDATE
          SET
            "sljedeciPregled" = EXCLUDED."sljedeciPregled",
            "napomena" = EXCLUDED."napomena"
        `,
        updateOperation,
      ];
    });

    await prisma.$transaction(operations);

    return Response.json({
      ok: true,
      updated: aparati.length,
      vrstaPregleda,
      datumPregleda,
      sljedeciPregled,
    });
  } catch (error) {
    console.error("POST /api/vatrogasni-aparati/obnovi error:", error);
    return new Response("Ne mogu obnoviti preglede vatrogasnih aparata.", {
      status: 500,
    });
  }
}
