import {
  addMonths,
  addYears,
  ensureVatrogasniAparatiTable,
  parseDate,
  type VatrogasniAparat,
} from "@/lib/fire-extinguishers";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureVatrogasniAparatiTable();

    const { id } = await params;
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

    const datumRedovnogPregleda = parseDate(body?.datumRedovnogPregleda);
    const sljedeciRedovniPregled =
      parseDate(body?.sljedeciRedovniPregled) ||
      (datumRedovnogPregleda ? addMonths(datumRedovnogPregleda, 3) : null);

    const datumPeriodicnogPregleda = parseDate(body?.datumPeriodicnogPregleda);
    const sljedeciPeriodicniPregled =
      parseDate(body?.sljedeciPeriodicniPregled) ||
      (datumPeriodicnogPregleda ? addYears(datumPeriodicnogPregleda, 1) : null);

    const rows = await prisma.$queryRaw<VatrogasniAparat[]>`
      UPDATE "VatrogasniAparat"
      SET
        "firmaId" = ${firmaId},
        "oznaka" = ${oznaka},
        "lokacija" = ${lokacija},
        "vrsta" = ${body?.vrsta ? String(body.vrsta).trim() : null},
        "proizvodjac" = ${body?.proizvodjac ? String(body.proizvodjac).trim() : null},
        "tvornickiBroj" = ${body?.tvornickiBroj ? String(body.tvornickiBroj).trim() : null},
        "datumRedovnogPregleda" = ${datumRedovnogPregleda},
        "sljedeciRedovniPregled" = ${sljedeciRedovniPregled},
        "datumPeriodicnogPregleda" = ${datumPeriodicnogPregleda},
        "sljedeciPeriodicniPregled" = ${sljedeciPeriodicniPregled},
        "status" = ${status},
        "napomena" = ${body?.napomena ? String(body.napomena).trim() : null},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${id}
      RETURNING *
    `;

    if (!rows[0]) {
      return new Response("Vatrogasni aparat nije pronađen.", { status: 404 });
    }

    return Response.json(rows[0]);
  } catch (error) {
    console.error("PUT /api/vatrogasni-aparati/[id] error:", error);
    return new Response("Ne mogu urediti vatrogasni aparat.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureVatrogasniAparatiTable();

    const { id } = await params;

    await prisma.$executeRaw`
      DELETE FROM "VatrogasniAparat"
      WHERE "id" = ${id}
    `;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/vatrogasni-aparati/[id] error:", error);
    return new Response("Ne mogu obrisati vatrogasni aparat.", {
      status: 500,
    });
  }
}
