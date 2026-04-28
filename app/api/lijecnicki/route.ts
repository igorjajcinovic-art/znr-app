import { prisma } from "@/lib/prisma";

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, dan, mjesec, godina] = dots;
    const d = new Date(
      `${godina}-${mjesec.padStart(2, "0")}-${dan.padStart(2, "0")}T00:00:00.000Z`
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function rokStatus(datum: Date | null): string {
  if (!datum) return "aktivno";

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const datumOnly = new Date(
    datum.getUTCFullYear(),
    datum.getUTCMonth(),
    datum.getUTCDate()
  );

  const diff = Math.ceil(
    (datumOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff < 0) return "isteklo";
  if (diff <= 30) return "uskoro";
  return "aktivno";
}

async function syncStatuse(firmaId: string | null) {
  const zapisi = await prisma.lijecnickiPregled.findMany({
    where: firmaId ? { firmaId } : undefined,
  });

  await Promise.all(
    zapisi.map(async (zapis) => {
      const status = rokStatus(zapis.vrijediDo);

      if (zapis.status !== status) {
        await prisma.lijecnickiPregled.update({
          where: { id: zapis.id },
          data: { status },
        });
      }
    })
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    await syncStatuse(firmaId);

    const data = await prisma.lijecnickiPregled.findMany({
      where: firmaId ? { firmaId } : undefined,
      orderBy: [{ vrijediDo: "asc" }, { createdAt: "desc" }],
    });

    return Response.json(data);
  } catch (error) {
    console.error("GET /api/lijecnicki error:", error);
    return new Response("Ne mogu učitati liječničke preglede.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const datum = parseDate(body?.datum);
    const vrijediDo = parseDate(body?.vrijediDo);

    if (!firmaId || !oib || !datum || !vrijediDo) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const zapis = await prisma.lijecnickiPregled.create({
      data: {
        firmaId,
        oib,
        vrsta: body?.vrsta ? String(body.vrsta).trim() : null,
        datum,
        vrijediDo,
        status: rokStatus(vrijediDo),
        napomena: body?.napomena ? String(body.napomena).trim() : null,
      },
    });

    return Response.json(zapis, { status: 201 });
  } catch (error) {
    console.error("POST /api/lijecnicki error:", error);
    return new Response("Ne mogu spremiti liječnički pregled.", { status: 500 });
  }
}