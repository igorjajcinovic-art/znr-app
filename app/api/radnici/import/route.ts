import { prisma } from "@/lib/prisma";

type Row = Record<string, unknown>;

function cleanText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .trim();
}

function normalizeKey(value: string): string {
  return value
    .replace(/^"+|"+$/g, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function get(row: Row, keys: string[]): string {
  const normalizedRow: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeKey(key)] = cleanText(value);
  }

  for (const key of keys) {
    const value = normalizedRow[normalizeKey(key)];
    if (value) return value;
  }

  return "";
}

function cleanOib(value: string): string {
  return value.replace(/\D/g, "");
}

function parseDate(value: string): Date | null {
  const v = cleanText(value);

  if (!v) return null;

  // Excel serial date, e.g. 43122
  if (/^\d{4,6}$/.test(v)) {
    const serial = Number(v);
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + serial * 24 * 60 * 60 * 1000);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  // 23.01.2018
  const dot = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);

  if (dot) {
    const [, d, m, y] = dot;

    const date = new Date(
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  // 2018-01-23
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (iso) {
    const [, y, m, d] = iso;

    const date = new Date(
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function parseBool(value: string): boolean {
  const v = cleanText(value).toLowerCase();

  return (
    v === "da" ||
    v === "yes" ||
    v === "true" ||
    v === "1" ||
    v === "aktivan"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const rows: Row[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!firmaId) {
      return new Response("Nedostaje firmaId", { status: 400 });
    }

    if (!rows.length) {
      return new Response("Nema redaka za uvoz", { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    const skippedRows: Array<{
      red: number;
      razlog: string;
      podatak: Row;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const ime = get(row, [
        "ime",
        "ime i prezime",
        "ime prezime",
        "radnik",
      ]);

      const prezime = get(row, ["prezime"]);

      const oib = cleanOib(get(row, ["oib"]));

      const punoIme =
        prezime && prezime !== oib ? `${ime} ${prezime}`.trim() : ime;

      const datumRaw = get(row, [
        "pocetak rada",
        "početak rada",
        "datum zaposlenja",
        "datum zaposljenja",
        "zaposlenje",
        "datum",
      ]);

      const aktivanRaw = get(row, ["aktivan", "status"]);

      const radnoMjesto = get(row, [
        "radno mjesto",
        "radno mj",
        "posao",
      ]);

      const grad = get(row, [
        "grad",
        "grad / mjesto",
        "grad mjesto",
        "mjesto",
      ]);

      const imaDozvoluRaw = get(row, [
        "ima radnu dozvolu",
        "radna dozvola",
        "dozvola",
        "ima dozvolu",
      ]);

      const dozvolaDoRaw = get(row, [
        "dozvola do",
        "radna dozvola do",
      ]);

      const datumZaposlenja = parseDate(datumRaw);
      const aktivan = parseBool(aktivanRaw);
      const imaDozvolu = parseBool(imaDozvoluRaw);
      const dozvolaDo = imaDozvolu ? parseDate(dozvolaDoRaw) : null;

      const razlozi: string[] = [];

      if (!punoIme) razlozi.push("nedostaje ime");
      if (!oib) razlozi.push("nedostaje OIB");

      if (oib && oib.length !== 11) {
        razlozi.push(`OIB nema 11 znamenki (${oib})`);
      }

      if (!datumZaposlenja) {
        razlozi.push(`nedostaje/neispravan datum (${datumRaw || "prazno"})`);
      }

      if (razlozi.length > 0 || !datumZaposlenja) {
        skipped++;

        skippedRows.push({
          red: i + 2,
          razlog: razlozi.join(", "),
          podatak: row,
        });

        continue;
      }

      await prisma.radnik.create({
        data: {
          firmaId,
          ime: punoIme,
          oib,
          datumZaposlenja,
          aktivan,
          radnoMjesto: radnoMjesto || null,
          grad: grad || null,
          imaDozvolu,
          dozvolaDo,
        },
      });

      imported++;
    }

    return Response.json({
      ok: true,
      imported,
      skipped,
      skippedRows,
    });
  } catch (error) {
    console.error("CSV IMPORT ERROR:", error);

    return new Response("Greška kod uvoza CSV-a/Excela", {
      status: 500,
    });
  }
}