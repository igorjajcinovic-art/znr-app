import {
  ensureTvrtkaDirektorColumn,
  type TvrtkaRecord,
} from "@/lib/companies";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureTvrtkaDirektorColumn();

    const { id } = await params;
    const body = await req.json();

    const naziv = String(body?.naziv ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const adresa =
      body?.adresa === null || body?.adresa === undefined
        ? null
        : String(body.adresa).trim() || null;
    const direktor =
      body?.direktor === null || body?.direktor === undefined
        ? null
        : String(body.direktor).trim() || null;

    if (!naziv || !oib) {
      return new Response("Naziv i OIB su obavezni.", { status: 400 });
    }

    await prisma.tvrtka.update({
      where: { id },
      data: {
        naziv,
        oib,
        adresa,
      },
    });

    const rows = await prisma.$queryRaw<TvrtkaRecord[]>`
      UPDATE "Tvrtka"
      SET "direktor" = ${direktor}
      WHERE "id" = ${id}
      RETURNING *
    `;

    return Response.json(rows[0]);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu urediti tvrtku.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      await tx.strucnoOsposobljavanje.deleteMany({
        where: { firmaId: id },
      });

      await tx.lijecnickiPregled.deleteMany({
        where: { firmaId: id },
      });

      await tx.radnik.deleteMany({
        where: { firmaId: id },
      });

      await tx.tvrtka.delete({
        where: { id },
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati tvrtku.", { status: 500 });
  }
}
