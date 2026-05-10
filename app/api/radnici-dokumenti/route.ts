import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  ensureRadnikDokumentiTable,
  type RadnikDokument,
} from "@/lib/worker-documents";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_");
}

function getExtension(originalName: string, mimeType: string) {
  const extFromName = path.extname(originalName || "").toLowerCase();
  if (extFromName) return extFromName;

  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return ".jpg";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "application/msword") return ".doc";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return ".docx";
  }
  if (mimeType === "application/vnd.ms-excel") return ".xls";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return ".xlsx";
  }

  return "";
}

export async function GET(req: Request) {
  try {
    await ensureRadnikDokumentiTable();

    const { searchParams } = new URL(req.url);
    const radnikId = searchParams.get("radnikId");
    const firmaId = searchParams.get("firmaId");

    if (!radnikId || !firmaId) {
      return new Response("Nedostaje radnikId ili firmaId.", { status: 400 });
    }

    const dokumenti = await prisma.$queryRaw<RadnikDokument[]>`
      SELECT * FROM "RadnikDokument"
      WHERE "radnikId" = ${radnikId} AND "firmaId" = ${firmaId}
      ORDER BY "createdAt" DESC
    `;

    return Response.json(dokumenti);
  } catch (error) {
    console.error("GET /api/radnici-dokumenti error:", error);
    return new Response("Ne mogu učitati dokumente radnika.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureRadnikDokumentiTable();

    const formData = await req.formData();

    const firmaId = String(formData.get("firmaId") ?? "").trim();
    const radnikId = String(formData.get("radnikId") ?? "").trim();
    const naziv = String(formData.get("naziv") ?? "").trim();
    const tip = String(formData.get("tip") ?? "ostalo").trim() || "ostalo";
    const napomena = String(formData.get("napomena") ?? "").trim() || null;
    const file = formData.get("file");

    if (!firmaId || !radnikId) {
      return new Response("Nedostaje radnikId ili firmaId.", { status: 400 });
    }

    if (!naziv) {
      return new Response("Naziv dokumenta je obavezan.", { status: 400 });
    }

    if (!(file instanceof File)) {
      return new Response("Datoteka nije poslana.", { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response("Dozvoljeni su PDF, JPG, PNG, Word i Excel dokumenti.", {
        status: 400,
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response("Datoteka je prevelika. Maksimalno 15 MB.", {
        status: 400,
      });
    }

    const radnik = await prisma.radnik.findFirst({
      where: { id: radnikId, firmaId },
      select: { id: true },
    });

    if (!radnik) {
      return new Response("Radnik nije pronađen.", { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = getExtension(file.name, file.type);
    const safeOriginal = sanitizeFileName(
      path.basename(file.name, path.extname(file.name))
    );
    const uniqueName = `${Date.now()}-${safeOriginal}${extension}`;

    const targetDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "radnici",
      radnikId
    );

    await mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, uniqueName);
    await writeFile(targetPath, buffer);

    const fileUrl = `/uploads/radnici/${radnikId}/${uniqueName}`;
    const id = randomUUID();

    const rows = await prisma.$queryRaw<RadnikDokument[]>`
      INSERT INTO "RadnikDokument" (
        "id",
        "firmaId",
        "radnikId",
        "naziv",
        "tip",
        "fileName",
        "fileUrl",
        "mimeType",
        "napomena",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${firmaId},
        ${radnikId},
        ${naziv},
        ${tip},
        ${uniqueName},
        ${fileUrl},
        ${file.type || null},
        ${napomena},
        CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/radnici-dokumenti error:", error);
    return new Response("Greška kod uploada dokumenta radnika.", {
      status: 500,
    });
  }
}
