import { prisma } from "@/lib/prisma";

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeStatus(status: unknown, datum: Date | null): string {
  const rawStatus = String(status ?? "planirano").trim().toLowerCase();

  if (rawStatus === "izvrseno") return "izvrseno";
  if (!datum) return "planirano";

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const datumOnly = new Date(
    datum.getUTCFullYear(),
    datum.getUTCMonth(),
    datum.getUTCDate()
  );

  if (datumOnly.getTime() < todayOnly.getTime()) {
    return "kasni";
  }

  return "planirano";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const zapis = await prisma.planer.findUnique({
      where: { id },
    });

    if (!zapis) {
      return new Response("Zapis nije pronađen.", { status: 404 });
    }

    return Response.json(zapis);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati zapis.", { status: 500 });
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
    const naziv = String(body?.naziv ?? "").trim();
    const tip = String(body?.tip ?? "ostalo").trim();
    const datum = parseDate(body?.datum);
    const status = normalizeStatus(body?.status, datum);

    if (!firmaId || !naziv || !datum) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const zapis = await prisma.planer.update({
      where: { id },
      data: {
        firmaId,
        naziv,
        opis: body?.opis ? String(body.opis).trim() : null,
        datum,
        tip,
        status,
        radnikId: body?.radnikId ? String(body.radnikId).trim() : null,
        opremaId: body?.opremaId ? String(body.opremaId).trim() : null,
      },
    });

    return Response.json(zapis);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu urediti zapis.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.planer.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati zapis.", { status: 500 });
  }
}