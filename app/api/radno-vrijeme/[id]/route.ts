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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureRadnoVrijemeTable();

    const { id } = await params;
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

    const zapis = await prisma.radnoVrijeme.update({
      where: { id },
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

    return Response.json(zapis);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu urediti radno vrijeme.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureRadnoVrijemeTable();

    const { id } = await params;

    await prisma.radnoVrijeme.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati radno vrijeme.", { status: 500 });
  }
}
