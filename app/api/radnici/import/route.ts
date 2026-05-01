import { prisma } from "@/lib/prisma";

type Row = Record<string, unknown>;

function get(row: Row, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function cleanOib(value: string): string {
  return value.replace(/\D/g, "");
}

function parseDate(value: string): Date | null {
  const v = value.trim();

  if (!v) return null;

  const dot = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);

  if (dot) {
    const [, d, m, y] = dot;

    const date = new Date(
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00.000Z`
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = new Date(v);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function parseAktivan(value: string): boolean {
  const v = value.trim().toLowerCase();

  if (!v) return true;

  return v === "da" || v === "aktivan" || v === "true" || v === "1";
}

function parseDaNe(value: string): boolean {
  const v = value.trim().toLowerCase();

  return (
    v === "da" ||
    v === "true" ||
    v === "1" ||
    v === "yes" ||
    v === "ima"
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
        "Ime",
        "Ime i prezime",
        "ime i prezime",
        "imePrezime",
      ]);

      const oib = cleanOib(
        get(row, [
          "oib",
          "OIB",
          "Oib",
        ])
      );

      const datumRaw = get(row, [
        "datumZaposlenja",
        "datum zaposlenja",
        "Datum zaposlenja",
        "Početak rada",
        "početak rada",
        "Pocetak rada",
        "pocetak rada",
        "pocetakRada",
        "početakRada",
        "datum",
        "Datum",
      ]);

      const aktivanRaw = get(row, [
        "aktivan",
        "Aktivan",
        "status",
        "Status",
      ]);

      const radnoMjesto = get(row, [
        "radnoMjesto",
        "Radno mjesto",
        "radno mjesto",
      ]);

      const grad = get(row, [
        "grad",
        "Grad",
        "Grad / mjesto",
        "grad / mjesto",
        "Grad mjesto",
      ]);

      const imaDozvoluRaw = get(row, [
        "imaDozvolu",
        "Ima radnu dozvolu",
        "ima radnu dozvolu",
        "Radna dozvola",
        "radna dozvola",
        "Dozvola",
        "dozvola",
      ]);

      const dozvolaDoRaw = get(row, [
        "dozvolaDo",
        "Dozvola do",
        "dozvola do",
        "Radna dozvola do",
        "radna dozvola do",
      ]);

      const datumZaposlenja = parseDate(datumRaw);
      const aktivan = parseAktivan(aktivanRaw);
      const imaDozvolu = parseDaNe(imaDozvoluRaw);
      const dozvolaDo = imaDozvolu ? parseDate(dozvolaDoRaw) : null;

      const razlozi: string[] = [];

      if (!ime) razlozi.push("nedostaje ime");
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
          ime,
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

    return new Response("Greška kod uvoza CSV-a", {
      status: 500,
    });
  }
}