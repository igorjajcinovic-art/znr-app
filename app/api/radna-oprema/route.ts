import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";

async function syncPlanerForStroj(input: {
  zapisId: string;
  firmaId: string;
  naziv: string;
  tip: string;
  sljedeciServis: Date | null;
  status: string;
}) {
  const nazivPlanera = `Servis stroja: ${input.naziv}`;

  const postojeci = await prisma.planer.findFirst({
    where: {
      firmaId: input.firmaId,
      tip: "servis",
      opremaId: input.zapisId,
      naziv: nazivPlanera,
    },
  });

  if (!input.sljedeciServis) {
    if (postojeci) {
      await prisma.planer.delete({
        where: { id: postojeci.id },
      });
    }
    return;
  }

  const payload = {
    firmaId: input.firmaId,
    naziv: nazivPlanera,
    opis: `Automatski generirano iz evidencije radne opreme. Tip: ${input.tip}. Status stroja: ${input.status}.`,
    datum: input.sljedeciServis,
    tip: "servis",
    status: "planirano",
    radnikId: null,
    opremaId: input.zapisId,
  };

  if (postojeci) {
    await prisma.planer.update({
      where: { id: postojeci.id },
      data: payload,
    });
  } else {
    await prisma.planer.create({
      data: payload,
    });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    const data = await prisma.radnaOprema.findMany({
      where: firmaId ? { firmaId } : undefined,
      orderBy: [
        { sljedeciServis: "asc" },
        { naziv: "asc" },
        { createdAt: "desc" },
      ],
    });

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati radnu opremu.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const naziv = String(body?.naziv ?? "").trim();
    const tip = String(body?.tip ?? "").trim();
    const status = String(body?.status ?? "aktivno").trim();

    if (!firmaId || !naziv || !tip) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const datumNabave = parseHrDate(body?.datumNabave);
    const datumServisa = parseHrDate(body?.datumServisa);
    const sljedeciServis = parseHrDate(body?.sljedeciServis);

    const zapis = await prisma.radnaOprema.create({
      data: {
        firmaId,
        naziv,
        tip,
        serijskiBroj: body?.serijskiBroj
          ? String(body.serijskiBroj).trim()
          : null,
        inventarniBroj: body?.inventarniBroj
          ? String(body.inventarniBroj).trim()
          : null,
        proizvodjac: body?.proizvodjac
          ? String(body.proizvodjac).trim()
          : null,
        model: body?.model ? String(body.model).trim() : null,
        datumNabave,
        datumServisa,
        sljedeciServis,
        status,
        napomena: body?.napomena ? String(body.napomena).trim() : null,
      },
    });

    await syncPlanerForStroj({
      zapisId: zapis.id,
      firmaId,
      naziv,
      tip,
      sljedeciServis,
      status,
    });

    return Response.json(zapis, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu spremiti radnu opremu.", { status: 500 });
  }
}
