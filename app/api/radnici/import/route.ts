import { prisma } from "@/lib/prisma";

type ImportRow = {
  ime?: string;
  oib?: string;
  aktivan?: boolean | string | null;
  datumOdjave?: string | null;
  datumZaposlenja?: string | null;
  datumRodjenja?: string | null;
  grad?: string | null;
  radnoMjesto?: string | null;
  imaDozvolu?: boolean | string | null;
  dozvolaDo?: string | null;
  znrOsposobljen?: boolean | string | null;
  znrDatum?: string | null;
  zopOsposobljen?: boolean | string | null;
  zopDatum?: string | null;
};

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  return v === "da" || v === "true" || v === "1" || v === "yes";
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (v.includes("T")) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, dd, mm, yyyy] = dots;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const slashes = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashes) {
    const [, dd, mm, yyyy] = slashes;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const firmaId = String(body?.firmaId ?? "");
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    if (rows.length === 0) {
      return new Response("Nema redaka za uvoz.", { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    for (const row of rows) {
      const ime = String(row.ime ?? "").trim();
      const oib = String(row.oib ?? "").trim();
      const datumZaposlenja = parseDate(row.datumZaposlenja);

      if (!ime || !oib || !datumZaposlenja) {
        skipped += 1;
        continue;
      }

      const aktivan = parseBool(
        row.aktivan === undefined || row.aktivan === null || row.aktivan === ""
          ? true
          : row.aktivan
      );

      const datumOdjave = aktivan ? null : parseDate(row.datumOdjave);
      const datumRodjenja = parseDate(row.datumRodjenja);
      const imaDozvolu = parseBool(row.imaDozvolu);
      const dozvolaDo = imaDozvolu ? parseDate(row.dozvolaDo) : null;
      const znrOsposobljen = parseBool(row.znrOsposobljen);
      const znrDatum = znrOsposobljen ? parseDate(row.znrDatum) : null;
      const zopOsposobljen = parseBool(row.zopOsposobljen);
      const zopDatum = zopOsposobljen ? parseDate(row.zopDatum) : null;

      await prisma.$transaction(async (tx) => {
        if (aktivan) {
          await tx.radnik.updateMany({
            where: {
              firmaId,
              oib,
              aktivan: true,
            },
            data: {
              aktivan: false,
            },
          });
        }

        await tx.radnik.create({
          data: {
            firmaId,
            ime,
            oib,
            aktivan,
            datumOdjave,
            datumZaposlenja,
            datumRodjenja,
            grad: row.grad ? String(row.grad).trim() : null,
            radnoMjesto: row.radnoMjesto ? String(row.radnoMjesto).trim() : null,
            imaDozvolu,
            dozvolaDo,
            znrOsposobljen,
            znrDatum,
            zopOsposobljen,
            zopDatum,
          },
        });
      });

      imported += 1;
    }

    return Response.json({
      ok: true,
      imported,
      skipped,
    });
  } catch (error) {
    console.error(error);
    return new Response("Greška kod uvoza radnika iz CSV-a.", {
      status: 500,
    });
  }
}