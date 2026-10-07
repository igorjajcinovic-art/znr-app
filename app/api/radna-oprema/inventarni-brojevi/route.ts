import { prisma } from "@/lib/prisma";
import { formatInventoryNumber, nextInventorySequence } from "@/lib/work-equipment-inventory";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const firmaId = String(body?.firmaId ?? "").trim();

    const result = await prisma.$transaction(async (tx) => {
      const missing = await tx.radnaOprema.findMany({
        where: {
          ...(firmaId ? { firmaId } : {}),
          OR: [{ inventarniBroj: null }, { inventarniBroj: "" }],
        },
        orderBy: [{ createdAt: "asc" }, { naziv: "asc" }],
        select: { id: true },
      });

      let sequence = await nextInventorySequence(tx);
      for (const item of missing) {
        await tx.radnaOprema.update({
          where: { id: item.id },
          data: { inventarniBroj: formatInventoryNumber(sequence) },
        });
        sequence += 1;
      }

      return { assigned: missing.length };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu dodijeliti inventarne brojeve.", { status: 500 });
  }
}
