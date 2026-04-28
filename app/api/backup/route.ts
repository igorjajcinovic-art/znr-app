import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      tvrtke,
      radnici,
      lijecnicki,
      osposobljavanja,
      oprema,
      radnaOprema,
      radnaOpremaDokumenti,
      planer,
      users,
    ] = await Promise.all([
      prisma.tvrtka.findMany({ orderBy: { naziv: "asc" } }),
      prisma.radnik.findMany({ orderBy: { ime: "asc" } }),
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
        users,
      },
    };

    const fileName = `znr-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

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