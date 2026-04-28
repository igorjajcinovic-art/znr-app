import { prisma } from "@/lib/prisma";

type ImportRow = {
  naziv?: string | null;
  tip?: string | null;
  serijskiBroj?: string | null;
  inventarniBroj?: string | null;
  proizvodjac?: string | null;
  model?: string | null;
  datumNabave?: string | null;
  datumServisa?: string | null;
  sljedeciServis?: string | null;
  status?: string | null;
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
      const naziv = String(row.naziv ?? "").trim();
      const tip = String(row.tip ?? "").trim();

      if (!naziv || !tip) {
        skipped += 1;
        continue;
      }

      const statusRaw = String(row.status ?? "aktivno").trim().toLowerCase();
      const status =
        statusRaw === "aktivno" ||
        statusRaw === "neispravno" ||
        statusRaw === "rashodovano" ||
        statusRaw === "na servisu"
          ? statusRaw
          : "aktivno";

      await prisma.radnaOprema.create({
        data: {
          firmaId,
          naziv,
          tip,
          serijskiBroj: row.serijskiBroj
            ? String(row.serijskiBroj).trim()
            : null,
          inventarniBroj: row.inventarniBroj
            ? String(row.inventarniBroj).trim()
            : null,
          proizvodjac: row.proizvodjac
            ? String(row.proizvodjac).trim()
            : null,
          model: row.model ? String(row.model).trim() : null,
          datumNabave: parseDate(row.datumNabave),
          datumServisa: parseDate(row.datumServisa),
          sljedeciServis: parseDate(row.sljedeciServis),
          status,
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
    return new Response("Greška kod uvoza radne opreme iz CSV-a.", {
      status: 500,
    });
  }
}