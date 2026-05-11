import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const oib = String(body?.oib ?? "").trim();
    const vrsta = String(body?.vrsta ?? "").trim();
    const kolicina = Number(body?.kolicina ?? 1);

    if (!firmaId || !oib || !vrsta) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const datumIzdavanja = parseHrDate(body?.datumIzdavanja);
    if (!datumIzdavanja) {
      return new Response("Datum izdavanja nije ispravan.", { status: 400 });
    }

    const rokZamjene = parseHrDate(body?.rokZamjene);

    const zapis = await prisma.oprema.update({
      where: { id },
      data: {
        firmaId,
        oib,
        vrsta,
        datumIzdavanja,
        kolicina: Number.isNaN(kolicina) || kolicina < 1 ? 1 : kolicina,
        rokZamjene,
        napomena: body?.napomena ? String(body.napomena).trim() : null,
      },
    });

    return Response.json(zapis);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu urediti opremu.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.oprema.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati opremu.", { status: 500 });
  }
}
