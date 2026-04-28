import { prisma } from "@/lib/prisma";

type ImportRow = {
  oib?: string;
  vrsta?: string | null;
  datumIzdavanja?: string | null;
  kolicina?: string | number | null;
  rokZamjene?: string | null;
  napomena?: string | null;
};

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

    for (const row of rows) {
      const oib = String(row.oib ?? "").trim();
      const vrsta = String(row.vrsta ?? "").trim();
      const datumIzdavanja = parseDate(row.datumIzdavanja);
      const rokZamjene = parseDate(row.rokZamjene);

      const kolicinaRaw = Number(row.kolicina ?? 1);
      const kolicina =
        Number.isNaN(kolicinaRaw) || kolicinaRaw < 1 ? 1 : kolicinaRaw;

      if (!oib || !vrsta || !datumIzdavanja) {
        skipped += 1;
        continue;
      }

      await prisma.oprema.create({
        data: {
          firmaId,
          oib,
          vrsta,
          datumIzdavanja,
          kolicina,
          rokZamjene,
          napomena: row.napomena ? String(row.napomena).trim() : null,
        },
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
    return new Response("Greška kod uvoza opreme iz CSV-a.", {
      status: 500,
    });
  }
}