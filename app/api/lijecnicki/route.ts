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
      return new Response("Liječnički pregled se može dodati samo aktivnom radniku.", {
        status: 400,
      });
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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    await prisma.lijecnickiPregled.deleteMany({
      where: { firmaId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE LIJECNICKI ERROR:", error);

    return new Response("Greška kod brisanja.", {
      status: 500,
    });
  }
}
