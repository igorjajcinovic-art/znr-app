import { unlink } from "fs/promises";
import path from "path";
import {
  ensureRadnikDokumentiTable,
  type RadnikDokument,
} from "@/lib/worker-documents";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureRadnikDokumentiTable();

    const { id } = await params;

    const rows = await prisma.$queryRaw<RadnikDokument[]>`
      SELECT * FROM "RadnikDokument"
      WHERE "id" = ${id}
      LIMIT 1
    `;
    const dokument = rows[0];

    if (!dokument) {
      return new Response("Dokument nije pronađen.", { status: 404 });
    }

    const absolutePath = path.join(process.cwd(), "public", dokument.fileUrl);

    try {
      await unlink(absolutePath);
    } catch {
      // Ako datoteka fizički ne postoji, svejedno brišemo zapis iz baze.
    }

    await prisma.$executeRaw`
      DELETE FROM "RadnikDokument"
      WHERE "id" = ${id}
    `;

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/radnici-dokumenti/[id] error:", error);
    return new Response("Ne mogu obrisati dokument radnika.", { status: 500 });
  }
}
