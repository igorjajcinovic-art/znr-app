import { prisma } from "@/lib/prisma";

type ImportRow = {
  [key: string]: unknown;

  ime?: string;
  prezime?: string;
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

  const v = String(value ?? "").trim().toLowerCase();

  return ["da", "true", "1", "yes", "y", "aktivan"].includes(v);
}

function cleanOib(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  const normalized = raw.replace(",", ".").replace(/\s/g, "");

  if (/^\d+(\.\d+)?e\+\d+$/i.test(normalized)) {
    const n = Number(normalized);
    if (Number.isFinite(n)) {
      return Math.round(n).toString();
    }
  }

  return raw.replace(/\D/g, "");
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v || v.includes("#")) return null;

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
    const d = new Date(
      `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const slashes = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashes) {
    const [, dd, mm, yyyy] = slashes;
    const d = new Date(
      `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getValue(row: ImportRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    if (rows.length === 0) {
      return new Response("Nema redaka za uvoz.", { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    const skippedRows: Array<{
      red: number;
      razlog: string;
      podatak: ImportRow;
    }> = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];

      const imeRaw = String(
        getValue(row, ["ime", "Ime", "Ime i prezime", "ime i prezime"])
      ).trim();

      const prezimeRaw = String(
        getValue(row, ["prezime", "Prezime", "__EMPTY", "", "Prezime radnika"])
      ).trim();

      const ime = prezimeRaw ? `${imeRaw} ${prezimeRaw}`.trim() : imeRaw;

      const oib = cleanOib(getValue(row, ["oib", "OIB", "Oib"]));

      const datumZaposlenja = parseDate(
        getValue(row, [
          "datumZaposlenja",
          "Datum zaposlenja",
          "datum zaposlenja",
          "Početak rada",
          "pocetak rada",
          "Poce­tak rada",
          "Zaposlenje",
        ])
      );

      const razlozi: string[] = [];

      if (!ime) razlozi.push("nedostaje ime i prezime");
      if (!oib) razlozi.push("nedostaje OIB");
      if (oib && oib.length !== 11) {
        razlozi.push(`OIB nema 11 znamenki (${oib})`);
      }
      if (!datumZaposlenja) {
        razlozi.push(
          `neispravan početak rada (${String(
            getValue(row, ["datumZaposlenja", "Početak rada", "Datum zaposlenja"])
          )})`
        );
      }

      if (razlozi.length > 0) {
        skipped += 1;
        skippedRows.push({
          red: i + 2,
          razlog: razlozi.join(", "),
          podatak: row,
        });
        continue;
      }

      const aktivan = parseBool(
        getValue(row, ["aktivan", "Aktivan", "Status"]) || true
      );

      const datumOdjave = aktivan
        ? null
        : parseDate(getValue(row, ["datumOdjave", "Datum odjave", "Odjava"]));

      const datumRodjenja = parseDate(
        getValue(row, ["datumRodjenja", "Datum rođenja", "Datum rodjenja"])
      );

      const grad = String(getValue(row, ["grad", "Grad", "Grad / mjesto"])).trim();

      const radnoMjesto = String(
        getValue(row, ["radnoMjesto", "Radno mjesto", "radno mjesto"])
      ).trim();

      const imaDozvolu = parseBool(
        getValue(row, ["imaDozvolu", "Ima radnu dozvolu", "Radna dozvola"])
      );

      const dozvolaDo = imaDozvolu
        ? parseDate(getValue(row, ["dozvolaDo", "Radna dozvola do", "Dozvola do"]))
        : null;

      const znrOsposobljen = parseBool(
        getValue(row, ["znrOsposobljen", "ZNR osposobljen", "ZNR"])
      );

      const znrDatum = znrOsposobljen
        ? parseDate(getValue(row, ["znrDatum", "Datum ZNR", "ZNR datum"]))
        : null;

      const zopOsposobljen = parseBool(
        getValue(row, ["zopOsposobljen", "ZOP osposobljen", "ZOP"])
      );

      const zopDatum = zopOsposobljen
        ? parseDate(getValue(row, ["zopDatum", "Datum ZOP", "ZOP datum"]))
        : null;

      await prisma.$transaction(async (tx) => {
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

        await tx.radnik.create({
          data: {
            firmaId,
            ime,
            oib,
            aktivan,
            datumOdjave,
            datumZaposlenja: datumZaposlenja as Date,
            datumRodjenja,
            grad: grad || null,
            radnoMjesto: radnoMjesto || null,
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
      skippedRows,
    });
  } catch (error) {
    console.error("IMPORT RADNICI ERROR:", error);
    return new Response("Greška kod uvoza radnika iz CSV-a.", {
      status: 500,
    });
  }
}