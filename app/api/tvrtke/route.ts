import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tvrtke = await prisma.tvrtka.findMany({
      orderBy: {
        naziv: "asc",
      },
    });

    return Response.json(tvrtke);
  } catch (error) {
    console.error("GET /api/tvrtke error:", error);
    return new Response("Ne mogu učitati tvrtke.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const naziv = String(body?.naziv ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const adresa = body?.adresa ? String(body.adresa).trim() : null;

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

    return Response.json(tvrtka, { status: 201 });
  } catch (error) {
    console.error("POST /api/tvrtke error:", error);
    return new Response("Ne mogu spremiti tvrtku.", { status: 500 });
  }
}