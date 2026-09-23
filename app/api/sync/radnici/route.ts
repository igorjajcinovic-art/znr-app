import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureRadnikKadrovskaColumns } from "@/lib/workers";

type CompanyRow = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
  direktor: string | null;
};

type WorkerRow = Record<string, unknown> & { firmaId: string };

function authorized(req: Request) {
  const expected = process.env.ZNR_SYNC_SECRET || "";
  const received = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function GET(req: Request) {
  if (!process.env.ZNR_SYNC_SECRET) {
    return Response.json({ error: "Automatsko povezivanje nije konfigurirano." }, { status: 503 });
  }
  if (!authorized(req)) {
    return Response.json({ error: "Neovlašten pristup." }, { status: 401 });
  }

  await ensureRadnikKadrovskaColumns();
  const [companies, workers] = await Promise.all([
    prisma.$queryRaw<CompanyRow[]>`
      SELECT "id", "naziv", "oib", "adresa", "direktor"
      FROM "Tvrtka"
      ORDER BY "naziv" ASC
    `,
    prisma.$queryRaw<WorkerRow[]>`
      SELECT "firmaId", "ime", "oib", "aktivan", "datumOdjave",
             "datumZaposlenja", "datumRodjenja", "spol", "drzavljanstvo",
             "grad", "ulica", "strucnoObrazovanje", "radnoMjesto",
             "vrstaUgovora", "razlogPrestanka", "prijavaOsiguranjaDatum",
             "imaDozvolu", "radnaDozvolaBroj", "dozvolaDo"
      FROM "Radnik"
      ORDER BY "ime" ASC
    `,
  ]);
  const companyOibById = new Map(companies.map((company) => [company.id, company.oib]));

  return Response.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    companies: companies.map((company) => ({
      sourceId: company.id,
      naziv: company.naziv,
      oib: company.oib,
      adresa: company.adresa,
      direktor: company.direktor,
    })),
    workers: workers.map((worker) => ({
      ...worker,
      companyOib: companyOibById.get(worker.firmaId) || "",
    })),
  });
}
