import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const PREFIX = "RO";
const NUMBER_WIDTH = 6;

export function formatInventoryNumber(sequence: number) {
  return `${PREFIX}-${String(sequence).padStart(NUMBER_WIDTH, "0")}`;
}

export async function nextInventorySequence(client: DatabaseClient = prisma) {
  const existing = await client.radnaOprema.findMany({
    where: { inventarniBroj: { startsWith: `${PREFIX}-` } },
    select: { inventarniBroj: true },
  });

  return existing.reduce((highest, item) => {
    const match = item.inventarniBroj?.match(/^RO-(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
}

export async function nextInventoryNumber(client: DatabaseClient = prisma) {
  return formatInventoryNumber(await nextInventorySequence(client));
}
