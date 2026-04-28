import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const dokument = await prisma.radnaOpremaDokument.findUnique({
      where: { id },
    });

    if (!dokument) {
      return new Response("Dokument nije pronađen.", { status: 404 });
    }

    const absolutePath = path.join(process.cwd(), "public", dokument.fileUrl);

    try {
      await unlink(absolutePath);
    } catch {
      // ako file fizički ne postoji, svejedno brišemo zapis iz baze
    }

    await prisma.radnaOpremaDokument.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati dokument.", { status: 500 });
  }
}