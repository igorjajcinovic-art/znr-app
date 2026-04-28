import { prisma } from "@/lib/prisma";

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  return v === "da" || v === "true" || v === "1" || v === "yes";
}

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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const postojeci = await prisma.radnik.findUnique({
      where: { id },
    });

    if (!postojeci) {
      return new Response("Radnik nije pronađen.", { status: 404 });
    }

    const firmaId = String(body?.firmaId ?? postojeci.firmaId).trim();
    const ime = String(body?.ime ?? "").trim();
    const oib = String(body?.oib ?? "").trim();

    if (!firmaId || !ime || !oib) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const aktivan = parseBool(
      body?.aktivan === undefined || body?.aktivan === null || body?.aktivan === ""
        ? postojeci.aktivan
        : body.aktivan
    );

    const datumZaposlenja = parseDate(body?.datumZaposlenja);
    if (!datumZaposlenja) {
      return new Response("Datum zaposlenja nije ispravan.", { status: 400 });
    }

    const datumOdjave = aktivan ? null : parseDate(body?.datumOdjave);
    const datumRodjenja = parseDate(body?.datumRodjenja);
    const imaDozvolu = parseBool(body?.imaDozvolu);
    const dozvolaDo = imaDozvolu ? parseDate(body?.dozvolaDo) : null;
    const znrOsposobljen = parseBool(body?.znrOsposobljen);
    const znrDatum = znrOsposobljen ? parseDate(body?.znrDatum) : null;
    const zopOsposobljen = parseBool(body?.zopOsposobljen);
    const zopDatum = zopOsposobljen ? parseDate(body?.zopDatum) : null;

    const radnik = await prisma.$transaction(async (tx) => {
      if (aktivan) {
        await tx.radnik.updateMany({
          where: {
            firmaId,
            oib,
            aktivan: true,
            NOT: { id },
          },
          data: {
            aktivan: false,
          },
        });
      }

      return tx.radnik.update({
        where: { id },
        data: {
          firmaId,
          ime,
          oib,
          aktivan,
          datumOdjave,
          datumZaposlenja,
          datumRodjenja,
          grad: body?.grad ? String(body.grad).trim() : null,
          radnoMjesto: body?.radnoMjesto ? String(body.radnoMjesto).trim() : null,
          imaDozvolu,
          dozvolaDo,
          znrOsposobljen,
          znrDatum,
          zopOsposobljen,
          zopDatum,
        },
      });
    });

    return Response.json(radnik);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu urediti radnika.", { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.radnik.delete({
      where: { id },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati radnika.", { status: 500 });
  }
}