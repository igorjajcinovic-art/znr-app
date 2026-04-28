import { prisma } from "@/lib/prisma";

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

  const zapis = await prisma.strucnoOsposobljavanje.create({
    data: {
      firmaId: body.firmaId,
      oib: body.oib,
      vrsta: body.vrsta,
      datum: new Date(body.datum),
      vrijediDo: new Date(body.vrijediDo),
      napomena: body.napomena || null,
    },
  });

  return Response.json(zapis, { status: 201 });
}