import { prisma } from "@/lib/prisma";

type ImportRow = Record<string, unknown>;

function val(row: ImportRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function cleanOib(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function parseDate(value: unknown): Date | null {
  const s = String(value ?? "").trim();

  if (!s) return null;

  const dotDate = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);

  if (dotDate) {
    const [, day, month, year] = dotDate;

    const date = new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(s);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAktivan(value: unknown): boolean {
  const s = String(value ?? "").trim().toLowerCase();

  if (!s) return true;

  return (
    s === "da" ||
    s === "aktivan" ||
    s === "true" ||
    s === "1" ||
    s === "yes"
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!firmaId) {
      return new Response("Nedostaje firmaId", { status: 400 });
    }

    if (!rows.length) {
      return new Response("Nema podataka za import", { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    const skippedRows: Array<{
      red: number;
      razlog: string;
      podatak: ImportRow;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const ime = val(row, [
        "ime",
        "Ime",
        "imePrezime",
        "Ime i prezime",
        "ime i prezime",
        "IME I PREZIME",
      ]);

      const oib = cleanOib(
        val(row, [
          "oib",
          "OIB",
          "Oib",
        ])
      );

      const datumRaw = val(row, [
        "datumZaposlenja",
        "Datum zaposlenja",
        "datum zaposlenja",
        "Početak rada",
        "početak rada",
        "Pocetak rada",
        "pocetak rada",
      ]);

      const datumZaposlenja = parseDate(datumRaw);

      const aktivanRaw = val(row, [
        "Aktivan",
        "aktivan",
        "Status",
        "status",
      ]);

      const aktivan = parseAktivan(aktivanRaw);

      const razlozi: string[] = [];

      if (!ime) razlozi.push("nedostaje ime");
      if (!oib) razlozi.push("nedostaje OIB");

      if (oib && oib.length !== 11) {
        razlozi.push(`OIB nema 11 znamenki (${oib})`);
      }

      if (!datumZaposlenja) {
        razlozi.push(`nedostaje/neispravan datum (${datumRaw})`);
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

      const datumZaposlenjaSafe: Date = datumZaposlenja;

      await prisma.radnik.create({
        data: {
          firmaId,
          ime,
          oib,
          datumZaposlenja: datumZaposlenjaSafe,
          aktivan,
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

    return new Response("Greška kod uvoza radnika", {
      status: 500,
    });
  }
}