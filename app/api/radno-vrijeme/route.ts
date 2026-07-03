import { parseHrDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  calculateWorkMinutes,
  ensureRadnoVrijemeTable,
  parseTimeToMinutes,
} from "@/lib/radno-vrijeme";

function normalizeStatus(value: unknown) {
  const status = String(value ?? "evidentirano").trim().toLowerCase();
  return ["evidentirano", "zakljuceno"].includes(status)
    ? status
    : "evidentirano";
}

function normalizePause(value: unknown) {
  const pauza = Number(value ?? 0);
  return Number.isFinite(pauza) && pauza > 0 ? Math.round(pauza) : 0;
}

export async function GET(req: Request) {
  try {
    await ensureRadnoVrijemeTable();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId")?.trim();
    const radnikId = searchParams.get("radnikId")?.trim();

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const data = await prisma.radnoVrijeme.findMany({
      where: {
        firmaId,
        ...(radnikId ? { radnikId } : {}),
      },
      orderBy: [{ datum: "desc" }, { pocetak: "asc" }, { createdAt: "desc" }],
    });

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati evidenciju radnog vremena.", {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    await ensureRadnoVrijemeTable();

    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const radnikId = String(body?.radnikId ?? "").trim();
    const datum = parseHrDate(body?.datum);
    const pocetak = String(body?.pocetak ?? "").trim();
    const kraj = String(body?.kraj ?? "").trim();
    const pauzaMin = normalizePause(body?.pauzaMin);
    const status = normalizeStatus(body?.status);

    if (!firmaId || !radnikId || !datum || !pocetak || !kraj) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    if (parseTimeToMinutes(pocetak) === null || parseTimeToMinutes(kraj) === null) {
      return new Response("Vrijeme mora biti u obliku HH:mm.", { status: 400 });
    }

    const ukupnoMin = calculateWorkMinutes(pocetak, kraj, pauzaMin);

    if (ukupnoMin === null) {
      return new Response("Vrijeme rada nije ispravno.", { status: 400 });
    }

    const radnik = await prisma.radnik.findFirst({
      where: { id: radnikId, firmaId, aktivan: true },
      select: { id: true, oib: true },
    });

    if (!radnik) {
      return new Response("Radno vrijeme se može dodati samo aktivnom radniku.", {
        status: 400,
      });
    }

    const zapis = await prisma.radnoVrijeme.create({
      data: {
        firmaId,
        radnikId: radnik.id,
        oib: radnik.oib,
        datum,
        pocetak,
        kraj,
        pauzaMin,
        ukupnoMin,
        status,
        napomena: body?.napomena ? String(body.napomena).trim() : null,
      },
    });

    return Response.json(zapis, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu spremiti radno vrijeme.", { status: 500 });
  }
}
