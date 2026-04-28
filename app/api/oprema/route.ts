import { prisma } from "@/lib/prisma";

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (v.includes("T")) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, dd, mm, yyyy] = dots;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const slashes = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashes) {
    const [, dd, mm, yyyy] = slashes;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

    const datumIzdavanja = parseDate(body?.datumIzdavanja);
    if (!datumIzdavanja) {
      return new Response("Datum izdavanja nije ispravan.", { status: 400 });
    }

    const rokZamjene = parseDate(body?.rokZamjene);

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