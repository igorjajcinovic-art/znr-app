import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firmaId = searchParams.get("firmaId");

  const osposobljavanja = await prisma.strucnoOsposobljavanje.findMany({
    where: firmaId ? { firmaId } : undefined,
    orderBy: { datum: "desc" },
  });

  return Response.json(osposobljavanja);
}

export async function POST(req: Request) {
  const body = await req.json();
  const datum = parseHrDate(body.datum);
  const vrijediDo = parseHrDate(body.vrijediDo);

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
      napomena: body.napomena || null,
    },
  });

  return Response.json(zapis, { status: 201 });
}
