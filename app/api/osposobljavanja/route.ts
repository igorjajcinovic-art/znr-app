import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";
import { ensureApplicationTables } from "@/lib/database";

const TRAJNO_VRIJEDI_DO = new Date("9999-12-31T00:00:00.000Z");

export async function GET(req: Request) {
  await ensureApplicationTables();

  const { searchParams } = new URL(req.url);
  const firmaId = searchParams.get("firmaId");

  const osposobljavanja = await prisma.strucnoOsposobljavanje.findMany({
    where: firmaId ? { firmaId } : undefined,
    orderBy: { datum: "desc" },
  });

  return Response.json(osposobljavanja);
}

export async function POST(req: Request) {
  await ensureApplicationTables();

  const body = await req.json();
  const datum = parseHrDate(body.datum);
  const trajno = Boolean(body.trajno);
  const vrijediDo = trajno ? TRAJNO_VRIJEDI_DO : parseHrDate(body.vrijediDo);

  if (!body.firmaId || !body.oib || !body.vrsta || !datum || !vrijediDo) {
    return new Response("Nedostaju obavezni podaci.", { status: 400 });
  }

  const zapis = await prisma.strucnoOsposobljavanje.create({
    data: {
      firmaId: body.firmaId,
      oib: body.oib,
      vrsta: body.vrsta,
      datum,
      vrijediDo,
      trajno,
      napomena: body.napomena || null,
    },
  });

  return Response.json(zapis, { status: 201 });
}
