import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

  return "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const radnaOpremaId = searchParams.get("radnaOpremaId");

    if (!radnaOpremaId) {
      return new Response("Nedostaje radnaOpremaId.", { status: 400 });
    }

    const dokumenti = await prisma.radnaOpremaDokument.findMany({
      where: { radnaOpremaId },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(dokumenti);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati dokumente.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const radnaOpremaId = String(formData.get("radnaOpremaId") ?? "").trim();
    const naziv = String(formData.get("naziv") ?? "").trim();
    const tip = String(formData.get("tip") ?? "ostalo").trim();
    const file = formData.get("file");

    if (!radnaOpremaId) {
      return new Response("Nedostaje radnaOpremaId.", { status: 400 });
    }

    if (!naziv) {
      return new Response("Naziv dokumenta je obavezan.", { status: 400 });
    }

    if (!(file instanceof File)) {
      return new Response("Datoteka nije poslana.", { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        "Dozvoljeni su samo PDF, JPG i PNG dokumenti/slike.",
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response("Datoteka je prevelika. Maksimalno 10 MB.", {
        status: 400,
      });
    }

    const postojiStroj = await prisma.radnaOprema.findUnique({
      where: { id: radnaOpremaId },
      select: { id: true },
    });

    if (!postojiStroj) {
      return new Response("Stroj nije pronađen.", { status: 404 });
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
      "radna-oprema",
      radnaOpremaId
    );

    await mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, uniqueName);
    await writeFile(targetPath, buffer);

    const fileUrl = `/uploads/radna-oprema/${radnaOpremaId}/${uniqueName}`;

    const dokument = await prisma.radnaOpremaDokument.create({
      data: {
        radnaOpremaId,
        naziv,
        tip: tip || "ostalo",
        fileName: uniqueName,
        fileUrl,
        mimeType: file.type || null,
      },
    });

    return Response.json(dokument, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response("Greška kod uploada dokumenta.", { status: 500 });
  }
}