import { prisma } from "@/lib/prisma";
import { ensureRadnikUlicaColumn } from "@/lib/workers";

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  const v = String(value ?? "").trim().toLowerCase();

  return (
    v === "da" ||
    v === "true" ||
    v === "1" ||
    v === "yes" ||
    v === "aktivan"
  );
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  const v = String(value).trim();
  if (!v) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, dan, mjesec, godina] = dots;

    const d = new Date(
      `${godina}-${mjesec.padStart(2, "0")}-${dan.padStart(
        2,
        "0"
      )}T00:00:00.000Z`
    );

    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  try {
    await ensureRadnikUlicaColumn();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const radnici = await prisma.$queryRaw`
      SELECT * FROM "Radnik"
      WHERE "firmaId" = ${firmaId}
      ORDER BY "ime" ASC
    `;

    return Response.json(radnici);
  } catch (error) {
    console.error("GET RADNICI ERROR:", error);

    return new Response("Greška kod dohvaćanja radnika.", {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  try {
    await ensureRadnikUlicaColumn();

    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const ime = String(body?.ime ?? "").trim();
    const oib = String(body?.oib ?? "").replace(/\D/g, "");

    const aktivan = parseBool(body?.aktivan);

    const datumZaposlenja = parseDate(body?.datumZaposlenja);
    const datumRodjenja = parseDate(body?.datumRodjenja);
    const datumOdjave = aktivan ? null : parseDate(body?.datumOdjave);

    const imaDozvolu = parseBool(body?.imaDozvolu);
    const dozvolaDo = imaDozvolu ? parseDate(body?.dozvolaDo) : null;

    const znrOsposobljen = parseBool(body?.znrOsposobljen);
    const znrDatum = znrOsposobljen ? parseDate(body?.znrDatum) : null;

    const zopOsposobljen = parseBool(body?.zopOsposobljen);
    const zopDatum = zopOsposobljen ? parseDate(body?.zopDatum) : null;

    if (!firmaId || !ime || !oib || !datumZaposlenja) {
      return new Response("Nedostaju obavezni podaci.", {
        status: 400,
      });
    }

    if (oib.length !== 11) {
      return new Response("OIB mora imati 11 znamenki.", {
        status: 400,
      });
    }

    const ulica = body?.ulica ? String(body.ulica).trim() : null;

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

      const kreiraniRadnik = await tx.radnik.create({
        data: {
          firmaId,
          ime,
          oib,
          aktivan,
          datumOdjave,
          datumZaposlenja,
          datumRodjenja,
          grad: body?.grad ? String(body.grad).trim() : null,
          radnoMjesto: body?.radnoMjesto
            ? String(body.radnoMjesto).trim()
            : null,
          imaDozvolu,
          dozvolaDo,
          znrOsposobljen,
          znrDatum,
          zopOsposobljen,
          zopDatum,
        },
      });

      await tx.$executeRaw`
        UPDATE "Radnik"
        SET "ulica" = ${ulica}
        WHERE "id" = ${kreiraniRadnik.id}
      `;

      return { ...kreiraniRadnik, ulica };
    });

    return Response.json(radnik);
  } catch (error) {
    console.error("CREATE RADNIK ERROR:", error);

    return new Response("Greška kod kreiranja radnika.", {
      status: 500,
    });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    await prisma.radnik.deleteMany({
      where: { firmaId },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE RADNICI ERROR:", error);

    return new Response("Greška kod brisanja radnika.", {
      status: 500,
    });
  }
}
