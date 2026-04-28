import { prisma } from "@/lib/prisma";

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(value.getDate()).padStart(2, "0")}`;
  }

  const v = String(value).trim();
  if (!v) return "";

  if (v.includes("T")) {
    return v.split("T")[0];
  }

  return v;
}

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const [tvrtka, zapisi] = await Promise.all([
      prisma.tvrtka.findUnique({
        where: { id: firmaId },
      }),
      prisma.radnaOprema.findMany({
        where: { firmaId },
        orderBy: [{ naziv: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    if (!tvrtka) {
      return new Response("Tvrtka nije pronađena.", { status: 404 });
    }

    const header = [
      "Naziv",
      "Tip",
      "Tvornički broj",
      "Inventarni broj",
      "Proizvođač",
      "Model",
      "Datum nabave",
      "Datum zadnjeg servisa",
      "Sljedeći servis",
      "Status",
      "Napomena",
    ];

    const rows = zapisi.map((z) => [
      z.naziv ?? "",
      z.tip ?? "",
      z.serijskiBroj ?? "",
      z.inventarniBroj ?? "",
      z.proizvodjac ?? "",
      z.model ?? "",
      formatDate(z.datumNabave),
      formatDate(z.datumServisa),
      formatDate(z.sljedeciServis),
      z.status ?? "",
      z.napomena ?? "",
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");

    const safeNaziv = (tvrtka.naziv || "tvrtka")
      .replace(/[^\p{L}\p{N}\-_]+/gu, "_")
      .replace(/_+/g, "_");

    const filename = `radna-oprema-${safeNaziv}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu izvesti CSV za radnu opremu.", {
      status: 500,
    });
  }
}