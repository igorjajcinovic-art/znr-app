import { prisma } from "@/lib/prisma";

type ImportRow = {
  oib?: string;
  vrsta?: string | null;
  datum?: string | null;
  vrijediDo?: string | null;
  napomena?: string | null;
};

function clean(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^"+|"+$/g, "")
    .trim();
}

function parseDate(value: unknown): Date | null {
  const v = clean(value);

  if (!v) return null;

  // Excel broj, npr. 45321
  if (/^\d{4,6}$/.test(v)) {
    const serial = Number(v);
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + serial * 86400000);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  // 16.2.2024 ili 16.02.2024
  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, dd, mm, yyyy] = dots;

    const d = new Date(
      `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(
        2,
        "0"
      )}T00:00:00.000Z`
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];
    const startRow = Number(body?.startRow ?? 0);

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    if (!rows.length) {
      return new Response("Nema redaka za uvoz.", { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const validRows: Array<{
      firmaId: string;
      oib: string;
      vrsta: string | null;
      datum: Date;
      vrijediDo: Date;
      napomena: string | null;
    }> = [];

    const oibs = Array.from(
      new Set(
        rows.map((row) => clean(row.oib).replace(/\D/g, "")).filter(Boolean)
      )
    );

    const aktivniRadnici = oibs.length
      ? await prisma.radnik.findMany({
          where: {
            firmaId,
            oib: { in: oibs },
            aktivan: true,
          },
          select: { oib: true },
        })
      : [];

    const aktivniOibSet = new Set(aktivniRadnici.map((radnik) => radnik.oib));

    const skippedRows: Array<{
      red: number;
      razlog: string;
      podatak: ImportRow;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const oib = clean(row.oib).replace(/\D/g, "");
      const datum = parseDate(row.datum);
      const vrijediDo = parseDate(row.vrijediDo);

      const razlozi: string[] = [];

      if (!oib) razlozi.push("nema OIB");
      if (oib && oib.length !== 11) {
        razlozi.push("OIB nije 11 znamenki");
      }

      if (!datum) razlozi.push("neispravan datum pregleda");
      if (!vrijediDo) razlozi.push("neispravan datum vrijedi do");

      if (!aktivniOibSet.has(oib)) {
        razlozi.push("aktivni radnik s tim OIB-om ne postoji u bazi");
      }

      if (razlozi.length > 0 || !datum || !vrijediDo) {
        skipped++;

        skippedRows.push({
          red: startRow + i + 2,
          razlog: razlozi.join(", "),
          podatak: row,
        });

        continue;
      }

      const datumSafe: Date = datum;
      const vrijediDoSafe: Date = vrijediDo;

      validRows.push({
        firmaId,
        oib,
        vrsta: clean(row.vrsta) || null,
        datum: datumSafe,
        vrijediDo: vrijediDoSafe,
        napomena: clean(row.napomena) || null,
      });
    }

    const batchSize = 250;
    for (let i = 0; i < validRows.length; i += batchSize) {
      const result = await prisma.lijecnickiPregled.createMany({
        data: validRows.slice(i, i + batchSize),
      });
      imported += result.count;
    }

    return Response.json({
      ok: true,
      imported,
      skipped,
      skippedRows,
    });
  } catch (error) {
    console.error("IMPORT LIJECNICKI ERROR:", error);

    return new Response("Greška kod uvoza liječničkih.", {
      status: 500,
    });
  }
}
