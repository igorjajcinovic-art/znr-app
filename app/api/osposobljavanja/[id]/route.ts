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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const zapis = await prisma.strucnoOsposobljavanje.findUnique({
      where: { id },
    });

    if (!zapis) {
      return new Response("Zapis nije pronađen.", { status: 404 });
    }

    return Response.json(zapis);
  } catch (error) {
    console.error("GET /api/osposobljavanja/[id] error:", error);
    return new Response("Ne mogu učitati osposobljavanje.", { status: 500 });
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
    const vrsta = String(body?.vrsta ?? "").trim();
    const datum = parseDate(body?.datum);
    const vrijediDo = parseDate(body?.vrijediDo);

    if (!firmaId || !oib || !vrsta || !datum || !vrijediDo) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const zapis = await prisma.strucnoOsposobljavanje.update({
      where: { id },
      data: {
        firmaId,
        oib,
        vrsta,
        datum,
        vrijediDo,
        napomena: body?.napomena ? String(body.napomena).trim() : null,
      },
    });

    return Response.json(zapis);
  } catch (error) {
    console.error("PUT /api/osposobljavanja/[id] error:", error);
    return new Response("Ne mogu urediti osposobljavanje.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.strucnoOsposobljavanje.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/osposobljavanja/[id] error:", error);
    return new Response("Ne mogu obrisati osposobljavanje.", { status: 500 });
  }
}