import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";
import { ensureApplicationTables } from "@/lib/database";

const TRAJNO_VRIJEDI_DO = new Date("9999-12-31T00:00:00.000Z");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureApplicationTables();
    const { id } = await params;

    const zapis = await prisma.strucnoOsposobljavanje.findUnique({
      where: { id },
    });

    if (!zapis) {
      return new Response("Zapis nije pronaden.", { status: 404 });
    }

    return Response.json(zapis);
  } catch (error) {
    console.error("GET /api/osposobljavanja/[id] error:", error);
    return new Response("Ne mogu ucitati osposobljavanje.", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureApplicationTables();
    const { id } = await params;
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const vrsta = String(body?.vrsta ?? "").trim();
    const datum = parseHrDate(body?.datum);
    const trajno = Boolean(body?.trajno);
    const vrijediDo = trajno ? TRAJNO_VRIJEDI_DO : parseHrDate(body?.vrijediDo);

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
        trajno,
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
