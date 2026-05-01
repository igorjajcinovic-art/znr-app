import { prisma } from "@/lib/prisma";

type Row = Record<string, any>;

function get(row: Row, keys: string[]) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") {
      return String(row[k]).trim();
    }
  }
  return "";
}

function parseDate(val: string): Date | null {
  if (!val) return null;

  // 17.06.2019
  if (val.includes(".")) {
    const [d, m, y] = val.split(".");
    if (!d || !m || !y) return null;
    return new Date(`${y}-${m}-${d}`);
  }

  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseAktivan(val: string): boolean {
  const v = val.toLowerCase();
  return v === "da" || v === "true" || v === "1" || v === "aktivan";
}

function cleanOib(val: string): string {
  return val.replace(/\D/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "");
    const rows: Row[] = body?.rows || [];

    let imported = 0;
    let skipped = 0;

    const skippedRows: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const ime = get(row, ["Ime i prezime", "ime i prezime", "ime"]);
      const oib = cleanOib(get(row, ["OIB", "oib"]));
      const datumRaw = get(row, ["Početak rada", "datum zaposlenja"]);
      const aktivanRaw = get(row, ["Aktivan", "Status"]);

      const datum = parseDate(datumRaw);
      const aktivan = parseAktivan(aktivanRaw);

      if (!ime || !oib || !datum) {
        skipped++;
        skippedRows.push({
          red: i + 2,
          razlog: "nedostaje ime/OIB/datum",
          podatak: row,
        });
        continue;
      }

      await prisma.radnik.create({
        data: {
          firmaId,
          ime,
          oib,
          datumZaposlenja: datum,
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
  } catch (err) {
    console.error(err);
    return new Response("Greška", { status: 500 });
  }
}