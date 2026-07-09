import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";
import { recordAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/server-auth";

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

export async function GET(req: Request) {
  try {
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
    const user = await getCurrentUser(req);
    const body = await req.json();

    const firmaId = String(body?.firmaId ?? "").trim();
    const ime = String(body?.ime ?? "").trim();
    const oib = String(body?.oib ?? "").replace(/\D/g, "");

    const aktivan = parseBool(body?.aktivan);

    const datumZaposlenja = parseHrDate(body?.datumZaposlenja);
    const datumRodjenja = parseHrDate(body?.datumRodjenja);
    const datumOdjave = aktivan ? null : parseHrDate(body?.datumOdjave);

    const imaDozvolu = parseBool(body?.imaDozvolu);
    const dozvolaDo = imaDozvolu ? parseHrDate(body?.dozvolaDo) : null;

    const znrOsposobljen = parseBool(body?.znrOsposobljen);
    const znrDatum = znrOsposobljen ? parseHrDate(body?.znrDatum) : null;

    const zopOsposobljen = parseBool(body?.zopOsposobljen);
    const zopDatum = zopOsposobljen ? parseHrDate(body?.zopDatum) : null;

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
          ulica,
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

      return kreiraniRadnik;
    });

    await recordAuditLog({
      user,
      action: "create",
      entityType: "radnik",
      entityId: radnik.id,
      entityLabel: radnik.ime,
      firmaId: radnik.firmaId,
      newData: radnik,
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
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const radnici = await prisma.radnik.findMany({
      where: { firmaId },
    });

    await prisma.radnik.deleteMany({
      where: { firmaId },
    });

    await recordAuditLog({
      user,
      action: "delete",
      entityType: "radnik",
      entityLabel: `Obrisano radnika: ${radnici.length}`,
      firmaId,
      oldData: radnici,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE RADNICI ERROR:", error);

    return new Response("Greška kod brisanja radnika.", {
      status: 500,
    });
  }
}
