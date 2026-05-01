import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const radnici = await prisma.radnik.findMany({
      where: { firmaId },
      orderBy: { ime: "asc" },
    });

    return Response.json(radnici);
  } catch (error) {
    console.error("GET RADNICI ERROR:", error);
    return new Response("Greška kod dohvaćanja radnika.", {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const radnik = await prisma.radnik.create({
      data: {
        ...body,
      },
    });

    return Response.json(radnik);
  } catch (error) {
    console.error("CREATE RADNIK ERROR:", error);
    return new Response("Greška kod kreiranja radnika.", {
      status: 500,
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    await prisma.radnik.deleteMany({
      where: { firmaId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE RADNICI ERROR:", error);
    return new Response("Greška kod brisanja radnika.", {
      status: 500,
    });
  }
}