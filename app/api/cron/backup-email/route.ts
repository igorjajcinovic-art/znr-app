import { ensureApplicationTables } from "@/lib/database";
import { ensureVatrogasniAparatiTable } from "@/lib/fire-extinguishers";
import { ensureRadnikDokumentiTable } from "@/lib/worker-documents";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RawRow = Record<string, unknown>;

type ResendAttachment = {
  filename: string;
  content: string;
};

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function backupFileName() {
  return `znr-automatski-backup-${todayStamp()}.json`;
}

function authOk(req: Request) {
  const secret = process.env.CRON_SECRET || process.env.BACKUP_CRON_SECRET || "";
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function buildBackup() {
  await ensureApplicationTables();
  await ensureRadnikDokumentiTable();
  await ensureVatrogasniAparatiTable();

  const [
    tvrtke,
    radnici,
    lijecnicki,
    osposobljavanja,
    oprema,
    radnaOprema,
    radnaOpremaDokumenti,
    planer,
    radnikDokumenti,
    vatrogasniAparati,
    vatrogasniPregledi,
    users,
  ] = await Promise.all([
    prisma.tvrtka.findMany({ orderBy: { naziv: "asc" } }),
    prisma.radnik.findMany({ orderBy: { ime: "asc" } }),
    prisma.lijecnickiPregled.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.strucnoOsposobljavanje.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.oprema.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.radnaOprema.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.radnaOpremaDokument.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.planer.findMany({ orderBy: { datum: "asc" } }),
    prisma.$queryRaw<Array<RawRow>>`
      SELECT * FROM "RadnikDokument"
      ORDER BY "createdAt" DESC
    `,
    prisma.$queryRaw<Array<RawRow>>`
      SELECT * FROM "VatrogasniAparat"
      ORDER BY "firmaId" ASC, "oznaka" ASC
    `,
    prisma.$queryRaw<Array<RawRow>>`
      SELECT * FROM "VatrogasniAparatPregled"
      ORDER BY "createdAt" DESC
    `,
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        ime: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    app: "ZNR aplikacija",
    version: "1.0.0",
    type: "automatic-email-backup",
    totals: {
      tvrtke: tvrtke.length,
      radnici: radnici.length,
      lijecnicki: lijecnicki.length,
      osposobljavanja: osposobljavanja.length,
      oprema: oprema.length,
      radnaOprema: radnaOprema.length,
      radnaOpremaDokumenti: radnaOpremaDokumenti.length,
      planer: planer.length,
      radnikDokumenti: radnikDokumenti.length,
      vatrogasniAparati: vatrogasniAparati.length,
      vatrogasniPregledi: vatrogasniPregledi.length,
      users: users.length,
    },
    data: {
      tvrtke,
      radnici,
      lijecnicki,
      osposobljavanja,
      oprema,
      radnaOprema,
      radnaOpremaDokumenti,
      planer,
      radnikDokumenti,
      vatrogasniAparati,
      vatrogasniPregledi,
      users,
    },
  };
}

async function sendBackupEmail(attachment: ResendAttachment, summary: Record<string, number>) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const to = process.env.BACKUP_EMAIL_TO || "";
  const from = process.env.BACKUP_EMAIL_FROM || "ZNR aplikacija <onboarding@resend.dev>";

  if (!apiKey || !to) {
    throw new Error("Nedostaju RESEND_API_KEY ili BACKUP_EMAIL_TO environment varijable.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `ZNR automatski backup - ${todayStamp()}`,
      text: [
        "Automatski backup ZNR aplikacije je u privitku.",
        "",
        `Tvrtke: ${summary.tvrtke ?? 0}`,
        `Radnici: ${summary.radnici ?? 0}`,
        `Lijecnicki pregledi: ${summary.lijecnicki ?? 0}`,
        `Osposobljavanja: ${summary.osposobljavanja ?? 0}`,
        `Vatrogasni aparati: ${summary.vatrogasniAparati ?? 0}`,
      ].join("\n"),
      attachments: [attachment],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Resend nije poslao email: ${response.status} ${message}`);
  }

  return response.json() as Promise<{ id?: string }>;
}

export async function GET(req: Request) {
  if (!authOk(req)) {
    return new Response("Neautorizirano.", { status: 401 });
  }

  try {
    const backup = await buildBackup();
    const json = JSON.stringify(backup, null, 2);
    const result = await sendBackupEmail(
      {
        filename: backupFileName(),
        content: Buffer.from(json, "utf8").toString("base64"),
      },
      backup.totals
    );

    return Response.json({
      ok: true,
      emailId: result.id || null,
      fileName: backupFileName(),
      totals: backup.totals,
    });
  } catch (error) {
    console.error("GET /api/cron/backup-email error:", error);
    const message = error instanceof Error ? error.message : "Nepoznata greska";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
