import { ensureAuditLogTable } from "@/lib/audit";
import { ensureApplicationTables } from "@/lib/database";
import { ensureVatrogasniAparatiTable } from "@/lib/fire-extinguishers";
import { prisma } from "@/lib/prisma";
import { ensureUserTable } from "@/lib/users";
import { ensureRadnikDokumentiTable } from "@/lib/worker-documents";

const IMPORT_KEY = "znr-import-2026-08-19-privremeno";

type Row = Record<string, unknown>;

type TableConfig = {
  columns: string[];
  dateColumns: string[];
};

const tables: Record<string, TableConfig> = {
  Tvrtka: {
    columns: ["id", "naziv", "oib", "adresa", "direktor", "createdAt", "updatedAt"],
    dateColumns: ["createdAt", "updatedAt"],
  },
  Radnik: {
    columns: ["id", "firmaId", "ime", "oib", "aktivan", "datumOdjave", "datumZaposlenja", "datumRodjenja", "grad", "ulica", "radnoMjesto", "imaDozvolu", "dozvolaDo", "znrOsposobljen", "znrDatum", "zopOsposobljen", "zopDatum", "createdAt", "updatedAt"],
    dateColumns: ["datumOdjave", "datumZaposlenja", "datumRodjenja", "dozvolaDo", "znrDatum", "zopDatum", "createdAt", "updatedAt"],
  },
  LijecnickiPregled: {
    columns: ["id", "firmaId", "oib", "vrsta", "datum", "vrijediDo", "status", "napomena", "createdAt", "updatedAt"],
    dateColumns: ["datum", "vrijediDo", "createdAt", "updatedAt"],
  },
  StrucnoOsposobljavanje: {
    columns: ["id", "firmaId", "oib", "vrsta", "datum", "vrijediDo", "status", "napomena", "createdAt", "updatedAt"],
    dateColumns: ["datum", "vrijediDo", "createdAt", "updatedAt"],
  },
  Oprema: {
    columns: ["id", "firmaId", "oib", "vrsta", "datumIzdavanja", "kolicina", "rokZamjene", "status", "napomena", "createdAt", "updatedAt"],
    dateColumns: ["datumIzdavanja", "rokZamjene", "createdAt", "updatedAt"],
  },
  RadnaOprema: {
    columns: ["id", "firmaId", "naziv", "tip", "serijskiBroj", "inventarniBroj", "proizvodjac", "model", "datumNabave", "datumServisa", "sljedeciServis", "status", "napomena", "createdAt", "updatedAt"],
    dateColumns: ["datumNabave", "datumServisa", "sljedeciServis", "createdAt", "updatedAt"],
  },
  RadnaOpremaDokument: {
    columns: ["id", "radnaOpremaId", "naziv", "tip", "fileName", "fileUrl", "mimeType", "createdAt", "updatedAt"],
    dateColumns: ["createdAt", "updatedAt"],
  },
  Planer: {
    columns: ["id", "firmaId", "naziv", "opis", "datum", "tip", "status", "radnikId", "opremaId", "createdAt", "updatedAt"],
    dateColumns: ["datum", "createdAt", "updatedAt"],
  },
  RadnoVrijeme: {
    columns: ["id", "firmaId", "radnikId", "oib", "datum", "pocetak", "kraj", "pauzaMin", "ukupnoMin", "status", "napomena", "createdAt", "updatedAt"],
    dateColumns: ["datum", "createdAt", "updatedAt"],
  },
  RadnikDokument: {
    columns: ["id", "firmaId", "radnikId", "naziv", "tip", "fileName", "fileUrl", "mimeType", "napomena", "createdAt", "updatedAt"],
    dateColumns: ["createdAt", "updatedAt"],
  },
  VatrogasniAparat: {
    columns: ["id", "firmaId", "oznaka", "lokacija", "vrsta", "proizvodjac", "tvornickiBroj", "datumRedovnogPregleda", "sljedeciRedovniPregled", "datumPeriodicnogPregleda", "sljedeciPeriodicniPregled", "status", "napomena", "createdAt", "updatedAt"],
    dateColumns: ["datumRedovnogPregleda", "sljedeciRedovniPregled", "datumPeriodicnogPregleda", "sljedeciPeriodicniPregled", "createdAt", "updatedAt"],
  },
  VatrogasniAparatPregled: {
    columns: ["id", "aparatId", "firmaId", "vrstaPregleda", "datumPregleda", "sljedeciPregled", "napomena", "createdAt"],
    dateColumns: ["datumPregleda", "sljedeciPregled", "createdAt"],
  },
};

function normalizeValue(value: unknown, column: string, config: TableConfig) {
  if (value === undefined || value === "") return null;
  if (value === null) return null;
  if (config.dateColumns.includes(column)) return new Date(String(value));
  return value;
}

async function ensureRestoreTables() {
  await ensureApplicationTables();
  await ensureUserTable();
  await ensureRadnikDokumentiTable();
  await ensureVatrogasniAparatiTable();
  await ensureAuditLogTable();
}

async function upsertRows(table: string, rows: Row[]) {
  const config = tables[table];
  if (!config) throw new Error(`Nepoznata tablica: ${table}`);

  let imported = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object" || !row.id) continue;

    const columns = config.columns.filter((column) => row[column] !== undefined);
    if (!columns.includes("id")) continue;

    const quotedColumns = columns.map((column) => `"${column}"`).join(", ");
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const updates = columns
      .filter((column) => column !== "id")
      .map((column) => `"${column}" = EXCLUDED."${column}"`)
      .join(", ");
    const values = columns.map((column) => normalizeValue(row[column], column, config));

    const sql = `
      INSERT INTO "${table}" (${quotedColumns})
      VALUES (${placeholders})
      ON CONFLICT ("id") DO UPDATE SET ${updates}
    `;

    await prisma.$executeRawUnsafe(sql, ...values);
    imported += 1;
  }

  return imported;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const key = String(body?.key || "");

    if (key !== IMPORT_KEY) {
      return new Response("Nedozvoljen import.", { status: 403 });
    }

    const table = String(body?.table || "");
    const rows = Array.isArray(body?.rows) ? (body.rows as Row[]) : [];

    if (!table || !tables[table]) {
      return new Response("Tablica nije podrzana.", { status: 400 });
    }

    await ensureRestoreTables();
    const imported = await upsertRows(table, rows);

    return Response.json({ ok: true, table, imported });
  } catch (error) {
    console.error("POST /api/backup/import error:", error);
    const message = error instanceof Error ? error.message : "Nepoznata greska";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
