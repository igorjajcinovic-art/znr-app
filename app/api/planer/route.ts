import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";

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

async function syncPlanerStatuse(firmaId: string | null) {
  const stavke = await prisma.planer.findMany({
    where: firmaId ? { firmaId } : undefined,
  });

  await Promise.all(
    stavke.map(async (stavka) => {
      const praviStatus = normalizeStatus(stavka.status, stavka.datum);

      if (stavka.status !== praviStatus) {
        await prisma.planer.update({
          where: { id: stavka.id },
          data: { status: praviStatus },
        });
      }
    })
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    await syncPlanerStatuse(firmaId);

    const data = await prisma.planer.findMany({
      where: firmaId ? { firmaId } : undefined,
      orderBy: [{ datum: "asc" }, { createdAt: "desc" }],
    });

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati planer.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const naziv = String(body?.naziv ?? "").trim();
    const tip = String(body?.tip ?? "ostalo").trim();
    const datum = parseHrDate(body?.datum);
    const status = normalizeStatus(body?.status, datum);

    if (!firmaId || !naziv || !datum) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const zapis = await prisma.planer.create({
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

    return Response.json(zapis, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu spremiti zapis u planer.", { status: 500 });
  }
}
