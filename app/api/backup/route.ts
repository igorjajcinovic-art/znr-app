import { prisma } from "@/lib/prisma";
import { ensureVatrogasniAparatiTable } from "@/lib/fire-extinguishers";
import { ensureRadnikDokumentiTable } from "@/lib/worker-documents";
import { ensureRadnikUlicaColumn } from "@/lib/workers";

type RawRow = Record<string, unknown>;

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
    await ensureRadnikUlicaColumn();
    await ensureRadnikDokumentiTable();
    await ensureVatrogasniAparatiTable();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (firmaId) {
      const tvrtka = await prisma.tvrtka.findUnique({
        where: { id: firmaId },
      });

      if (!tvrtka) {
        return new Response("Tvrtka nije pronađena.", { status: 404 });
      }

      const [
        radnici,
        lijecnicki,
        osposobljavanja,
        oprema,
        radnaOprema,
        planer,
        radnikDokumenti,
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
          radnaOpremaDokumenti,
          planer,
          radnikDokumenti,
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
      vatrogasniAparati,
      vatrogasniPregledi,
      users,
    ] = await Promise.all([
      prisma.tvrtka.findMany({ orderBy: { naziv: "asc" } }),
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
        radnaOpremaDokumenti,
        planer,
        radnikDokumenti,
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
