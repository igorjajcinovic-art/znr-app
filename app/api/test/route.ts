import { prisma } from "@/lib/prisma";

export async function GET() {
  const postoji = await prisma.tvrtka.findFirst({
    where: { oib: "11111111111" },
  });

  if (!postoji) {
    await prisma.tvrtka.create({
      data: {
        naziv: "Test firma",
        oib: "11111111111",
        adresa: "Test adresa 1",
      },
    });
  }

  const sve = await prisma.tvrtka.findMany({
    orderBy: { naziv: "asc" },
  });

  return Response.json(sve);
}