import { parseHrDate } from "@/lib/dates";
import { recordAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import {
  calculateWorkMinutes,
  ensureRadnoVrijemeTable,
  parseTimeToMinutes,
} from "@/lib/radno-vrijeme";
import { getCurrentUser } from "@/lib/server-auth";

function normalizeStatus(value: unknown) {
  const status = String(value ?? "evidentirano").trim().toLowerCase();
  return ["evidentirano", "zakljuceno"].includes(status)
    ? status
    : "evidentirano";
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

    const aktivniRadnici = await prisma.radnik.findMany({
      where: {
        firmaId,
        aktivan: true,
        ...(radnikId ? { id: radnikId } : {}),
      },
      select: { id: true, oib: true },
    });
    const aktivniRadnikIds = aktivniRadnici.map((radnik) => radnik.id);
    const aktivniOibovi = aktivniRadnici.map((radnik) => radnik.oib);

    if (radnikId && aktivniRadnikIds.length === 0) {
      return Response.json([]);
    }

    const data = await prisma.radnoVrijeme.findMany({
      where: {
        firmaId,
        OR: [
          { radnikId: { in: aktivniRadnikIds } },
          { oib: { in: aktivniOibovi } },
        ],
      },
      orderBy: [{ datum: "desc" }, { pocetak: "asc" }, { createdAt: "desc" }],
    });

    return Response.json(
      data.map((zapis) => ({
        ...zapis,
        pauzaMin: 0,
        ukupnoMin:
          calculateWorkMinutes(zapis.pocetak, zapis.kraj) ?? zapis.ukupnoMin,
      }))
    );
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

    const user = await getCurrentUser(req);
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const radnikId = String(body?.radnikId ?? "").trim();
    const datum = parseHrDate(body?.datum);
    const pocetak = String(body?.pocetak ?? "").trim();
    const kraj = String(body?.kraj ?? "").trim();
    const pauzaMin = 0;
    const status = normalizeStatus(body?.status);

    if (!firmaId || !radnikId || !datum || !pocetak || !kraj) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    if (parseTimeToMinutes(pocetak) === null || parseTimeToMinutes(kraj) === null) {
      return new Response("Vrijeme mora biti u obliku HH:mm.", { status: 400 });
    }

    const ukupnoMin = calculateWorkMinutes(pocetak, kraj);

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

    await recordAuditLog({
      user,
      action: "create",
      entityType: "radno_vrijeme",
      entityId: zapis.id,
      entityLabel: `${zapis.oib} - ${zapis.datum.toISOString().slice(0, 10)}`,
      firmaId: zapis.firmaId,
      newData: zapis,
    });

    return Response.json(zapis, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu spremiti radno vrijeme.", { status: 500 });
  }
}
