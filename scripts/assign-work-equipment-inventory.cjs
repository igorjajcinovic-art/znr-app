require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const used = await tx.radnaOprema.findMany({
      where: { inventarniBroj: { startsWith: "RO-" } },
      select: { inventarniBroj: true },
    });
    let sequence = used.reduce((highest, item) => {
      const match = (item.inventarniBroj || "").match(/^RO-(\d+)$/i);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;

    const missing = await tx.radnaOprema.findMany({
      where: { OR: [{ inventarniBroj: null }, { inventarniBroj: "" }] },
      orderBy: [{ createdAt: "asc" }, { naziv: "asc" }],
      select: { id: true },
    });

    for (const item of missing) {
      await tx.radnaOprema.update({
        where: { id: item.id },
        data: { inventarniBroj: `RO-${String(sequence).padStart(6, "0")}` },
      });
      sequence += 1;
    }

    return { assigned: missing.length, total: await tx.radnaOprema.count() };
  });

  console.log(`Dodijeljeno: ${result.assigned}`);
  console.log(`Ukupno strojeva/zapisa: ${result.total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
