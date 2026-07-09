import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

type AuditUser = {
  id: string;
  email: string;
  ime: string;
  role: string;
} | null;

type AuditInput = {
  user: AuditUser;
  action: "create" | "update" | "delete";
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  firmaId?: string | null;
  oldData?: unknown;
  newData?: unknown;
};

export async function ensureAuditLogTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL,
      "userId" TEXT,
      "userEmail" TEXT,
      "userName" TEXT,
      "userRole" TEXT,
      "action" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT,
      "entityLabel" TEXT,
      "firmaId" TEXT,
      "oldData" JSONB,
      "newData" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_entityType_idx" ON "AuditLog"("entityType");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_firmaId_idx" ON "AuditLog"("firmaId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
  `);
}

export async function recordAuditLog(input: AuditInput) {
  await ensureAuditLogTable();

  await prisma.$executeRaw`
    INSERT INTO "AuditLog" (
      "id",
      "userId",
      "userEmail",
      "userName",
      "userRole",
      "action",
      "entityType",
      "entityId",
      "entityLabel",
      "firmaId",
      "oldData",
      "newData"
    )
    VALUES (
      ${randomUUID()},
      ${input.user?.id ?? null},
      ${input.user?.email ?? null},
      ${input.user?.ime ?? null},
      ${input.user?.role ?? null},
      ${input.action},
      ${input.entityType},
      ${input.entityId ?? null},
      ${input.entityLabel ?? null},
      ${input.firmaId ?? null},
      ${input.oldData === undefined ? null : JSON.stringify(input.oldData)}::jsonb,
      ${input.newData === undefined ? null : JSON.stringify(input.newData)}::jsonb
    );
  `;
}
