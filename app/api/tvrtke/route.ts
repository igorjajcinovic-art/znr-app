import {
  ensureTvrtkaDirektorColumn,
  type TvrtkaRecord,
} from "@/lib/companies";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensureTvrtkaDirektorColumn();

    const tvrtke = await prisma.$queryRaw<TvrtkaRecord[]>`
      SELECT * FROM "Tvrtka"
      ORDER BY "naziv" ASC
    `;

    return Response.json(tvrtke);
  } catch (error) {
    console.error("GET /api/tvrtke error:", error);
    return new Response("Ne mogu učitati tvrtke.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTvrtkaDirektorColumn();

    const body = await req.json();

    const naziv = String(body?.naziv ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const adresa = body?.adresa ? String(body.adresa).trim() : null;
    const direktor = body?.direktor ? String(body.direktor).trim() : null;

    if (!naziv || !oib) {
      return new Response("Naziv i OIB su obavezni.", { status: 400 });
    }

    const tvrtka = await prisma.tvrtka.create({
      data: {
        naziv,
        oib,
        adresa,
      },
    });

    const rows = await prisma.$queryRaw<TvrtkaRecord[]>`
      UPDATE "Tvrtka"
      SET "direktor" = ${direktor}
      WHERE "id" = ${tvrtka.id}
      RETURNING *
    `;

    return Response.json(rows[0] || tvrtka, { status: 201 });
  } catch (error) {
    console.error("POST /api/tvrtke error:", error);
    return new Response("Ne mogu spremiti tvrtku.", { status: 500 });
  }
}
