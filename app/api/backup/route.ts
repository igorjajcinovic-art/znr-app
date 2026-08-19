import { prisma } from "@/lib/prisma";
import { ensureApplicationTables } from "@/lib/database";
import { ensureTvrtkaDirektorColumn, type TvrtkaRecord } from "@/lib/companies";
import { ensureVatrogasniAparatiTable } from "@/lib/fire-extinguishers";
import { ensureRadnikDokumentiTable } from "@/lib/worker-documents";
import { ensureTvrtkaDokumentiTable } from "@/lib/company-documents";

type RawRow = Record<string, unknown>;

type BackupFileRow = { fileUrl?: unknown };

const MAX_EMBEDDED_FILE_URL_LENGTH = 200_000;

function prepareRowsForBackup<T extends BackupFileRow>(rows: T[]) {
  let omittedFiles = 0;

  const safeRows = rows.map((row) => {
    const fileUrl = row.fileUrl;

    if (
      typeof fileUrl === "string" &&
      fileUrl.startsWith("data:") &&
      fileUrl.length > MAX_EMBEDDED_FILE_URL_LENGTH
    ) {
      omittedFiles += 1;

      return {
        ...row,
        fileUrl: "[izostavljeno iz backup-a jer je datoteka prevelika]",
        fileOmittedFromBackup: true,
        originalFileUrlLength: fileUrl.length,
      };
    }

    return row;
  });

  return { rows: safeRows, omittedFiles };
}

function backupFileName(prefix: string, naziv?: string | null) {
  const safeName = naziv
    ? `-${naziv
        .normalize("NFKD")
        .replace(/[^\w]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase()}`
    : "";

  return `${prefix}${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
}

export async function GET(req: Request) {
  try {
    await ensureApplicationTables();
    await ensureTvrtkaDirektorColumn();
    await ensureRadnikDokumentiTable();
    await ensureTvrtkaDokumentiTable();
    await ensureVatrogasniAparatiTable();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (firmaId) {
      const tvrtke = await prisma.$queryRaw<TvrtkaRecord[]>`
        SELECT * FROM "Tvrtka"
        WHERE "id" = ${firmaId}
        LIMIT 1
      `;
      const tvrtka = tvrtke[0];

      if (!tvrtka) {
        return new Response("Tvrtka nije pronadena.", { status: 404 });
      }

      const [
        radnici,
        lijecnicki,
        osposobljavanja,
        oprema,
        radnaOprema,
        planer,
        radnikDokumenti,
        tvrtkaDokumenti,
        vatrogasniAparati,
        vatrogasniPregledi,
      ] = await Promise.all([
        prisma.$queryRaw<Array<RawRow>>`
          SELECT * FROM "Radnik"
          WHERE "firmaId" = ${firmaId}
          ORDER BY "ime" ASC
        `,
        prisma.lijecnickiPregled.findMany({
          where: { firmaId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.strucnoOsposobljavanje.findMany({
          where: { firmaId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.oprema.findMany({
          where: { firmaId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.radnaOprema.findMany({
          where: { firmaId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.planer.findMany({
          where: { firmaId },
          orderBy: { datum: "asc" },
        }),
        prisma.$queryRaw<Array<RawRow>>`
          SELECT * FROM "RadnikDokument"
          WHERE "firmaId" = ${firmaId}
          ORDER BY "createdAt" DESC
        `,
        prisma.$queryRaw<Array<RawRow>>`
          SELECT * FROM "TvrtkaDokument"
          WHERE "firmaId" = ${firmaId}
          ORDER BY "createdAt" DESC
        `,
        prisma.$queryRaw<Array<RawRow>>`
          SELECT * FROM "VatrogasniAparat"
          WHERE "firmaId" = ${firmaId}
          ORDER BY "oznaka" ASC
        `,
        prisma.$queryRaw<Array<RawRow>>`
          SELECT * FROM "VatrogasniAparatPregled"
          WHERE "firmaId" = ${firmaId}
          ORDER BY "createdAt" DESC
        `,
      ]);

      const radnaOpremaIds = radnaOprema.map((item) => item.id);
      const radnaOpremaDokumenti = radnaOpremaIds.length
        ? await prisma.radnaOpremaDokument.findMany({
            where: { radnaOpremaId: { in: radnaOpremaIds } },
            orderBy: { createdAt: "desc" },
          })
        : [];

      const safeRadnaOpremaDokumenti = prepareRowsForBackup(radnaOpremaDokumenti);
      const safeRadnikDokumenti = prepareRowsForBackup(radnikDokumenti);
      const safeTvrtkaDokumenti = prepareRowsForBackup(tvrtkaDokumenti);

      const backup = {
        exportedAt: new Date().toISOString(),
        app: "ZNR aplikacija",
        version: "1.0.0",
        scope: "tvrtka",
        tvrtka: {
          id: tvrtka.id,
          naziv: tvrtka.naziv,
          oib: tvrtka.oib,
        },
        totals: {
          radnici: radnici.length,
          lijecnicki: lijecnicki.length,
          osposobljavanja: osposobljavanja.length,
          oprema: oprema.length,
          radnaOprema: radnaOprema.length,
          radnaOpremaDokumenti: radnaOpremaDokumenti.length,
          planer: planer.length,
          radnikDokumenti: radnikDokumenti.length,
          tvrtkaDokumenti: tvrtkaDokumenti.length,
          izostavljeneVelikeDatoteke:
            safeRadnaOpremaDokumenti.omittedFiles +
            safeRadnikDokumenti.omittedFiles +
            safeTvrtkaDokumenti.omittedFiles,
          vatrogasniAparati: vatrogasniAparati.length,
          vatrogasniPregledi: vatrogasniPregledi.length,
        },
        data: {
          tvrtka,
          radnici,
          lijecnicki,
          osposobljavanja,
          oprema,
          radnaOprema,
          radnaOpremaDokumenti: safeRadnaOpremaDokumenti.rows,
          planer,
          radnikDokumenti: safeRadnikDokumenti.rows,
          tvrtkaDokumenti: safeTvrtkaDokumenti.rows,
          vatrogasniAparati,
          vatrogasniPregledi,
        },
      };

      return new Response(JSON.stringify(backup, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${backupFileName(
            "znr-backup-tvrtka",
            tvrtka.naziv
          )}"`,
        },
      });
    }

    const [
      tvrtke,
      radnici,
      lijecnicki,
      osposobljavanja,
      oprema,
      radnaOprema,
      radnaOpremaDokumenti,
      planer,
      radnikDokumenti,
      tvrtkaDokumenti,
      vatrogasniAparati,
      vatrogasniPregledi,
      users,
    ] = await Promise.all([
      prisma.$queryRaw<TvrtkaRecord[]>`
        SELECT * FROM "Tvrtka"
        ORDER BY "naziv" ASC
      `,
      prisma.$queryRaw<Array<RawRow>>`
        SELECT * FROM "Radnik"
        ORDER BY "ime" ASC
      `,
      prisma.lijecnickiPregled.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.strucnoOsposobljavanje.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.oprema.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.radnaOprema.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.radnaOpremaDokument.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.planer.findMany({ orderBy: { datum: "asc" } }),
      prisma.$queryRaw<Array<RawRow>>`
        SELECT * FROM "RadnikDokument"
        ORDER BY "createdAt" DESC
      `,
      prisma.$queryRaw<Array<RawRow>>`
        SELECT * FROM "TvrtkaDokument"
        ORDER BY "firmaId" ASC, "createdAt" DESC
      `,
      prisma.$queryRaw<Array<RawRow>>`
        SELECT * FROM "VatrogasniAparat"
        ORDER BY "firmaId" ASC, "oznaka" ASC
      `,
      prisma.$queryRaw<Array<RawRow>>`
        SELECT * FROM "VatrogasniAparatPregled"
        ORDER BY "createdAt" DESC
      `,
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          ime: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const safeRadnaOpremaDokumenti = prepareRowsForBackup(radnaOpremaDokumenti);
    const safeRadnikDokumenti = prepareRowsForBackup(radnikDokumenti);
    const safeTvrtkaDokumenti = prepareRowsForBackup(tvrtkaDokumenti);

    const backup = {
      exportedAt: new Date().toISOString(),
      app: "ZNR aplikacija",
      version: "1.0.0",
      totals: {
        tvrtke: tvrtke.length,
        radnici: radnici.length,
        lijecnicki: lijecnicki.length,
        osposobljavanja: osposobljavanja.length,
        oprema: oprema.length,
        radnaOprema: radnaOprema.length,
        radnaOpremaDokumenti: radnaOpremaDokumenti.length,
        planer: planer.length,
        radnikDokumenti: radnikDokumenti.length,
        tvrtkaDokumenti: tvrtkaDokumenti.length,
        izostavljeneVelikeDatoteke:
          safeRadnaOpremaDokumenti.omittedFiles +
          safeRadnikDokumenti.omittedFiles +
          safeTvrtkaDokumenti.omittedFiles,
        vatrogasniAparati: vatrogasniAparati.length,
        vatrogasniPregledi: vatrogasniPregledi.length,
        users: users.length,
      },
      data: {
        tvrtke,
        radnici,
        lijecnicki,
        osposobljavanja,
        oprema,
        radnaOprema,
        radnaOpremaDokumenti: safeRadnaOpremaDokumenti.rows,
        planer,
        radnikDokumenti: safeRadnikDokumenti.rows,
        tvrtkaDokumenti: safeTvrtkaDokumenti.rows,
        vatrogasniAparati,
        vatrogasniPregledi,
        users,
      },
    };

    const fileName = backupFileName("znr-backup");

    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return new Response("Ne mogu napraviti backup baze.", { status: 500 });
  }
}
