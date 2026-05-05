import { prisma } from "@/lib/prisma";

function isWarningDate(date: Date | null): boolean {
  if (!date) return false;

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const targetOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diff = Math.ceil(
    (targetOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diff <= 30;
}

export async function GET() {
  try {
    const [aktivniRadnici, lijecnicki, osposobljavanja, ozo, radnaOprema, planer] =
      await Promise.all([
        prisma.radnik.findMany({
          where: {
            aktivan: true,
          },
        }),
        prisma.lijecnickiPregled.findMany(),
        prisma.strucnoOsposobljavanje.findMany(),
        prisma.oprema.findMany(),
        prisma.radnaOprema.findMany(),
        prisma.planer.findMany(),
      ]);

    const aktivniPoFirmiIOibu = new Set(
      aktivniRadnici.map((r) => `${r.firmaId}-${r.oib}`)
    );

    const aktivniPoId = new Set(aktivniRadnici.map((r) => r.id));

    const dozvole = aktivniRadnici.filter(
      (r) => r.imaDozvolu && isWarningDate(r.dozvolaDo)
    ).length;

    const lijecnickiCount = lijecnicki.filter(
      (p) => aktivniPoFirmiIOibu.has(`${p.firmaId}-${p.oib}`) && isWarningDate(p.vrijediDo)
    ).length;

    const osposobljavanjaCount = osposobljavanja.filter(
      (o) => aktivniPoFirmiIOibu.has(`${o.firmaId}-${o.oib}`) && isWarningDate(o.vrijediDo)
    ).length;

    const ozoCount = ozo.filter(
      (o) => aktivniPoFirmiIOibu.has(`${o.firmaId}-${o.oib}`) && isWarningDate(o.rokZamjene)
    ).length;

    const radnaOpremaCount = radnaOprema.filter((o) =>
      isWarningDate(o.sljedeciServis)
    ).length;

    const planerCount = planer.filter((p) => {
      if (p.status === "izvrseno") return false;

      if (p.radnikId && !aktivniPoId.has(p.radnikId)) return false;

      return isWarningDate(p.datum);
    }).length;

    const ukupno =
      dozvole +
      lijecnickiCount +
      osposobljavanjaCount +
      ozoCount +
      radnaOpremaCount +
      planerCount;

    return Response.json({
      ukupno,
      dozvole,
      lijecnicki: lijecnickiCount,
      osposobljavanja: osposobljavanjaCount,
      ozo: ozoCount,
      radnaOprema: radnaOpremaCount,
      planer: planerCount,
    });
  } catch (error) {
    console.error("GET /api/upozorenja/count error:", error);
    return new Response("Ne mogu učitati broj upozorenja.", { status: 500 });
  }
}