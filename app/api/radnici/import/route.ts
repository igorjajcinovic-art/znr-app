import { prisma } from "@/lib/prisma";

type ImportRow = {
  [key: string]: unknown;
};

// --- helpers ---

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  const v = String(value ?? "").trim().toLowerCase();
  return ["da", "true", "1", "yes", "y", "aktivan"].includes(v);
}

function cleanOib(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // ukloni sve osim brojeva
  return raw.replace(/\D/g, "");
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  // 17.06.2019
  if (v.includes(".")) {
    const [d, m, y] = v.split(".");
    if (!d || !m || !y) return null;
    return new Date(`${y}-${m}-${d}`);
  }

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// --- main API ---

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const rows: ImportRow[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!firmaId) {
      return new Response("Nedostaje firmaId", { status: 400 });
    }

    if (rows.length === 0) {
      return new Response("Nema podataka za import", { status: 400 });
    }

    let imported = 0;
    let skipped = 0;

    const skippedRows: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // 👉 uzmi podatke DIREKTNO iz CSV-a
      const fullName = String(
        row["Ime i prezime"] ||
          row["ime i prezime"] ||
          row["ime"] ||
          ""
      ).trim();

      const oib = cleanOib(row["OIB"] || row["oib"]);
      const datumRaw =
        row["Početak rada"] ||
        row["početak rada"] ||
        row["datum zaposlenja"];

      const datumZaposlenja = parseDate(datumRaw);

      // --- VALIDACIJA ---
      if (!fullName || !oib || !datumZaposlenja) {
        skipped++;
        skippedRows.push({
          red: i + 2,
          razlog: "nedostaje ime/OIB/datum",
          podatak: row,
        });
        continue;
      }

      try {
        await prisma.radnik.create({
          data: {
            firmaId,
            ime: fullName, // 🔥 VAŽNO: ime i prezime zajedno
            oib,
            datumZaposlenja,
            aktivan: true,
          },
        });

        imported++;
      } catch (err) {
        skipped++;
        skippedRows.push({
          red: i + 2,
          razlog: "greška u bazi",
          podatak: row,
        });
      }
    }

    return Response.json({
      ok: true,
      imported,
      skipped,
      skippedRows,
    });
  } catch (err) {
    console.error(err);

    return new Response("Server error", { status: 500 });
  }
}