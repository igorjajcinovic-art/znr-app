import { prisma } from "@/lib/prisma";

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (v.includes("T")) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, dd, mm, yyyy] = dots;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const slashes = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashes) {
    const [, dd, mm, yyyy] = slashes;
    const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

async function deletePlanerForStroj(zapisId: string) {
  const postojeci = await prisma.planer.findFirst({
    where: {
      tip: "servis",
      opremaId: zapisId,
    },
  });

  if (postojeci) {
    await prisma.planer.delete({
      where: { id: postojeci.id },
    });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const zapis = await prisma.radnaOprema.findUnique({
      where: { id },
    });

    if (!zapis) {
      return new Response("Zapis nije pronađen.", { status: 404 });
    }

    return Response.json(zapis);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati zapis.", { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const naziv = String(body?.naziv ?? "").trim();
    const tip = String(body?.tip ?? "").trim();
    const status = String(body?.status ?? "aktivno").trim();

    if (!firmaId || !naziv || !tip) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const datumNabave = parseDate(body?.datumNabave);
    const datumServisa = parseDate(body?.datumServisa);
    const sljedeciServis = parseDate(body?.sljedeciServis);

    const zapis = await prisma.radnaOprema.update({
      where: { id },
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

    return Response.json(zapis);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu urediti radnu opremu.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deletePlanerForStroj(id);

    await prisma.radnaOprema.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati zapis.", { status: 500 });
  }
}