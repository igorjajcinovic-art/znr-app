import { prisma } from "@/lib/prisma";
import { ensureRadnikUlicaColumn } from "@/lib/workers";

type RadnikIspis = {
  id: string;
  ime: string;
  oib: string;
  aktivan: boolean;
  datumZaposlenja: Date;
  datumOdjave: Date | null;
  grad: string | null;
  ulica: string | null;
  imaDozvolu: boolean;
  dozvolaDo: Date | null;
};

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}.${d.getUTCFullYear()}.`;
}

function statusTitle(status: string | null) {
  if (status === "aktivni") return "Popis aktivnih radnika";
  if (status === "neaktivni") return "Popis neaktivnih radnika";
  return "Popis radnika";
}

export async function GET(req: Request) {
  try {
    await ensureRadnikUlicaColumn();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");
    const status = searchParams.get("status");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const tvrtka = await prisma.tvrtka.findUnique({
      where: { id: firmaId },
    });

    const radnici =
      status === "aktivni"
        ? await prisma.$queryRaw<RadnikIspis[]>`
            SELECT
              "id",
              "ime",
              "oib",
              "aktivan",
              "datumZaposlenja",
              "datumOdjave",
              "grad",
              "ulica",
              "imaDozvolu",
              "dozvolaDo"
            FROM "Radnik"
            WHERE "firmaId" = ${firmaId} AND "aktivan" = true
            ORDER BY "ime" ASC
          `
        : status === "neaktivni"
        ? await prisma.$queryRaw<RadnikIspis[]>`
            SELECT
              "id",
              "ime",
              "oib",
              "aktivan",
              "datumZaposlenja",
              "datumOdjave",
              "grad",
              "ulica",
              "imaDozvolu",
              "dozvolaDo"
            FROM "Radnik"
            WHERE "firmaId" = ${firmaId} AND "aktivan" = false
            ORDER BY "ime" ASC
          `
        : await prisma.$queryRaw<RadnikIspis[]>`
            SELECT
              "id",
              "ime",
              "oib",
              "aktivan",
              "datumZaposlenja",
              "datumOdjave",
              "grad",
              "ulica",
              "imaDozvolu",
              "dozvolaDo"
            FROM "Radnik"
            WHERE "firmaId" = ${firmaId}
            ORDER BY "ime" ASC
          `;

    const title = statusTitle(status);

    const html = `
      <!doctype html>
      <html lang="hr">
      <head>
        <meta charset="utf-8"/>
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #111827; }
          h1 { margin: 0 0 5px; font-size: 24px; }
          h3 { margin: 0; color: #4b5563; }
          .meta { margin-top: 12px; color: #4b5563; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
          button { margin-bottom: 16px; padding: 8px 12px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Ispiši / spremi kao PDF</button>

        <h1>${escapeHtml(tvrtka?.naziv || "")}</h1>
        <h3>${escapeHtml(title)}</h3>
        <div class="meta">Broj radnika: ${radnici.length}</div>

        <table>
          <tr>
            <th>Ime i prezime</th>
            <th>OIB</th>
            <th>Adresa</th>
            <th>Datum početka rada</th>
            <th>Datum odjave</th>
            <th>Radna dozvola vrijedi do</th>
          </tr>

          ${radnici
            .map(
              (r) => {
                const adresa =
                  [r.ulica, r.grad].filter(Boolean).join(", ") || "-";

                return `
              <tr>
                <td>${escapeHtml(r.ime)}</td>
                <td>${escapeHtml(r.oib)}</td>
                <td>${escapeHtml(adresa)}</td>
                <td>${escapeHtml(formatDate(r.datumZaposlenja))}</td>
                <td>${escapeHtml(formatDate(r.datumOdjave))}</td>
                <td>${escapeHtml(r.imaDozvolu ? formatDate(r.dozvolaDo) : "-")}</td>
              </tr>
            `;
              }
            )
            .join("")}
        </table>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return new Response("Greška kod ispisa radnika.", { status: 500 });
  }
}
