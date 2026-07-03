import { parseHrDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  calculateWorkMinutes,
  ensureRadnoVrijemeTable,
  parseTimeToMinutes,
} from "@/lib/radno-vrijeme";

type EntryInput = {
  radnikId?: unknown;
  datum?: unknown;
  pocetak?: unknown;
  kraj?: unknown;
  status?: unknown;
  napomena?: unknown;
};

type PreparedEntry = {
  radnikId: string;
  datum: Date;
  key: string;
  pocetak: string;
  kraj: string;
  status: string;
  napomena: string | null;
};

function normalizeStatus(value: unknown) {
  const status = String(value ?? "evidentirano").trim().toLowerCase();
  return ["evidentirano", "zakljuceno"].includes(status)
    ? status
    : "evidentirano";
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function existingKey(radnikId: string, datum: Date) {
  return `${radnikId}|${dateKey(datum)}`;
}

export async function POST(req: Request) {
  try {
    await ensureRadnoVrijemeTable();

    const body = await req.json();
    const firmaId = String(body?.firmaId ?? "").trim();
    const entries = Array.isArray(body?.entries)
      ? (body.entries as EntryInput[])
      : [];

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    if (entries.length === 0) {
      return Response.json({ ok: true, saved: 0, deleted: 0 });
    }

    const radnikIds = Array.from(
      new Set(
        entries
          .map((entry) => String(entry.radnikId ?? "").trim())
          .filter(Boolean)
      )
    );

    const radnici = await prisma.radnik.findMany({
      where: { firmaId, aktivan: true, id: { in: radnikIds } },
      select: { id: true, oib: true },
    });
    const radnikPoId = new Map(radnici.map((radnik) => [radnik.id, radnik]));

    const preparedEntries: PreparedEntry[] = [];

    for (const entry of entries) {
      const radnikId = String(entry.radnikId ?? "").trim();
      const datum = parseHrDate(entry.datum);

      if (!radnikPoId.has(radnikId) || !datum) continue;

      const pocetak = String(entry.pocetak ?? "").trim();
      const kraj = String(entry.kraj ?? "").trim();

      preparedEntries.push({
        radnikId,
        datum,
        key: dateKey(datum),
        pocetak,
        kraj,
        status: normalizeStatus(entry.status),
        napomena: entry.napomena ? String(entry.napomena).trim() : null,
      });
    }

    const dates = preparedEntries.map((entry) => entry.key).sort();
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const existingRecords =
      firstDate && lastDate
        ? await prisma.radnoVrijeme.findMany({
            where: {
              firmaId,
              radnikId: { in: radnikIds },
              datum: {
                gte: new Date(`${firstDate}T00:00:00.000Z`),
                lt: new Date(`${lastDate}T23:59:59.999Z`),
              },
            },
            orderBy: { createdAt: "asc" },
          })
        : [];

    const existingByCell = new Map<string, typeof existingRecords>();
    existingRecords.forEach((zapis) => {
      if (!zapis.radnikId) return;
      const key = existingKey(zapis.radnikId, zapis.datum);
      const list = existingByCell.get(key) || [];
      list.push(zapis);
      existingByCell.set(key, list);
    });

    let saved = 0;
    let deleted = 0;

    for (const entry of preparedEntries) {
      const radnik = radnikPoId.get(entry.radnikId);
      if (!radnik) continue;

      const existing = existingByCell.get(existingKey(radnik.id, entry.datum)) || [];

      if (!entry.pocetak && !entry.kraj) {
        if (existing.length > 0) {
          await prisma.radnoVrijeme.deleteMany({
            where: { id: { in: existing.map((zapis) => zapis.id) } },
          });
          deleted += existing.length;
        }
        continue;
      }

      if (
        parseTimeToMinutes(entry.pocetak) === null ||
        parseTimeToMinutes(entry.kraj) === null
      ) {
        continue;
      }

      const ukupnoMin = calculateWorkMinutes(entry.pocetak, entry.kraj);
      if (ukupnoMin === null) continue;

      const data = {
        firmaId,
        radnikId: radnik.id,
        oib: radnik.oib,
        datum: entry.datum,
        pocetak: entry.pocetak,
        kraj: entry.kraj,
        pauzaMin: 0,
        ukupnoMin,
        status: entry.status,
        napomena: entry.napomena,
      };

      if (existing[0]) {
        await prisma.radnoVrijeme.update({
          where: { id: existing[0].id },
          data,
        });
        if (existing.length > 1) {
          await prisma.radnoVrijeme.deleteMany({
            where: { id: { in: existing.slice(1).map((zapis) => zapis.id) } },
          });
        }
      } else {
        await prisma.radnoVrijeme.create({ data });
      }

      saved += 1;
    }

    return Response.json({ ok: true, saved, deleted });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu spremiti mjesecnu evidenciju.", {
      status: 500,
    });
  }
}
