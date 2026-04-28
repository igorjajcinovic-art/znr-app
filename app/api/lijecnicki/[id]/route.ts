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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const zapis = await prisma.lijecnickiPregled.findUnique({
      where: { id },
    });

    if (!zapis) {
      return new Response("Zapis nije pronađen.", { status: 404 });
    }

    return Response.json(zapis);
  } catch (error) {
    console.error("GET /api/lijecnicki/[id] error:", error);
    return new Response("Ne mogu učitati liječnički pregled.", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const datum = parseDate(body?.datum);
    const vrijediDo = parseDate(body?.vrijediDo);

    if (!firmaId || !oib || !datum || !vrijediDo) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const zapis = await prisma.lijecnickiPregled.update({
      where: { id },
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

    return Response.json(zapis);
  } catch (error) {
    console.error("PUT /api/lijecnicki/[id] error:", error);
    return new Response("Ne mogu urediti liječnički pregled.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.lijecnickiPregled.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/lijecnicki/[id] error:", error);
    return new Response("Ne mogu obrisati liječnički pregled.", { status: 500 });
  }
}