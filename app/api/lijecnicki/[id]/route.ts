import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";

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
    const datum = parseHrDate(body?.datum);
    const vrijediDo = parseHrDate(body?.vrijediDo);

    if (!firmaId || !oib || !datum || !vrijediDo) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const aktivniRadnik = await prisma.radnik.findFirst({
      where: {
        firmaId,
        oib,
        aktivan: true,
      },
    });

    if (!aktivniRadnik) {
      return new Response("Liječnički pregled se može spremiti samo aktivnom radniku.", {
        status: 400,
      });
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
