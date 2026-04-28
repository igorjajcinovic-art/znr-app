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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    const radnici = await prisma.radnik.findMany({
      where: firmaId ? { firmaId } : undefined,
      orderBy: [
        { aktivan: "desc" },
        { ime: "asc" },
        { createdAt: "desc" },
      ],
    });

    return Response.json(radnici);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu učitati radnike.", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const ime = String(body?.ime ?? "").trim();
    const oib = String(body?.oib ?? "").trim();

    if (!firmaId || !ime || !oib) {
      return new Response("Nedostaju obavezni podaci.", { status: 400 });
    }

    const aktivan = parseBool(
      body?.aktivan === undefined || body?.aktivan === null || body?.aktivan === ""
        ? true
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
          },
          data: {
            aktivan: false,
          },
        });
      }

      return tx.radnik.create({
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

    return Response.json(radnik, { status: 201 });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu spremiti radnika.", { status: 500 });
  }
}