import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    const oprema = await prisma.oprema.findMany({
      where: firmaId ? { firmaId } : undefined,
      orderBy: [{ datumIzdavanja: "desc" }, { createdAt: "desc" }],
    });

    return Response.json(oprema);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati opremu.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const vrsta = String(body?.vrsta ?? "").trim();
    const kolicina = Number(body?.kolicina ?? 1);

    if (!firmaId || !oib || !vrsta) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const datumIzdavanja = parseHrDate(body?.datumIzdavanja);
    if (!datumIzdavanja) {
      return new Response("Datum izdavanja nije ispravan.", { status: 400 });
    }

    const rokZamjene = parseHrDate(body?.rokZamjene);

    const aktivniRadnik = await prisma.radnik.findFirst({
      where: { firmaId, oib, aktivan: true },
      select: { id: true },
    });

    if (!aktivniRadnik) {
      return new Response("OZO se može dodati samo aktivnom radniku.", {
        status: 400,
      });
    }

    const zapis = await prisma.oprema.create({
      data: {
        firmaId,
        oib,
        vrsta,
        datumIzdavanja,
        kolicina: Number.isNaN(kolicina) || kolicina < 1 ? 1 : kolicina,
        rokZamjene,
        napomena: body?.napomena ? String(body.napomena).trim() : null,
      },
    });

    return Response.json(zapis, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu spremiti opremu.", { status: 500 });
  }
}
