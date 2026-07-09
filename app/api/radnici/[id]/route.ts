import { prisma } from "@/lib/prisma";
import { parseHrDate } from "@/lib/dates";
import { recordAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/server-auth";

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;

  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  return v === "da" || v === "true" || v === "1" || v === "yes";
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
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

    const datumZaposlenja = parseHrDate(body?.datumZaposlenja);
    if (!datumZaposlenja) {
      return new Response("Datum zaposlenja nije ispravan.", { status: 400 });
    }

    const datumOdjave = aktivan ? null : parseHrDate(body?.datumOdjave);
    const datumRodjenja = parseHrDate(body?.datumRodjenja);
    const imaDozvolu = parseBool(body?.imaDozvolu);
    const dozvolaDo = imaDozvolu ? parseHrDate(body?.dozvolaDo) : null;
    const znrOsposobljen = parseBool(body?.znrOsposobljen);
    const znrDatum = znrOsposobljen ? parseHrDate(body?.znrDatum) : null;
    const zopOsposobljen = parseBool(body?.zopOsposobljen);
    const zopDatum = zopOsposobljen ? parseHrDate(body?.zopDatum) : null;

    const ulica = body?.ulica ? String(body.ulica).trim() : null;

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

      const azuriraniRadnik = await tx.radnik.update({
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
          ulica,
          radnoMjesto: body?.radnoMjesto ? String(body.radnoMjesto).trim() : null,
          imaDozvolu,
          dozvolaDo,
          znrOsposobljen,
          znrDatum,
          zopOsposobljen,
          zopDatum,
        },
      });

      return azuriraniRadnik;
    });

    await recordAuditLog({
      user,
      action: "update",
      entityType: "radnik",
      entityId: radnik.id,
      entityLabel: radnik.ime,
      firmaId: radnik.firmaId,
      oldData: postojeci,
      newData: radnik,
    });

    return Response.json(radnik);
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu urediti radnika.", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await params;

    const postojeci = await prisma.radnik.findUnique({
      where: { id },
    });

    await prisma.radnik.delete({
      where: { id },
    });

    await recordAuditLog({
      user,
      action: "delete",
      entityType: "radnik",
      entityId: postojeci?.id ?? id,
      entityLabel: postojeci?.ime ?? id,
      firmaId: postojeci?.firmaId ?? null,
      oldData: postojeci,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu obrisati radnika.", { status: 500 });
  }
}
