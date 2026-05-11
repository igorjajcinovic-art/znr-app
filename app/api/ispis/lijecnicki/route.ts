import { prisma } from "@/lib/prisma";

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const [tvrtka, pregledi, radnici] = await Promise.all([
      prisma.tvrtka.findUnique({
        where: { id: firmaId },
      }),
      prisma.lijecnickiPregled.findMany({
        where: { firmaId },
        orderBy: [{ vrijediDo: "asc" }, { datum: "desc" }],
      }),
      prisma.radnik.findMany({
        where: { firmaId },
        select: {
          ime: true,
          oib: true,
        },
      }),
    ]);

    const radnikPoOib = new Map(radnici.map((radnik) => [radnik.oib, radnik]));

    const rows = pregledi
      .map((pregled) => {
        const radnik = radnikPoOib.get(pregled.oib);

        return `
          <tr>
            <td>${escapeHtml(radnik?.ime || "-")}</td>
            <td>${escapeHtml(pregled.oib)}</td>
            <td>${escapeHtml(formatDate(pregled.datum))}</td>
            <td>${escapeHtml(formatDate(pregled.vrijediDo))}</td>
            <td>${escapeHtml(pregled.napomena || "")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html lang="hr">
      <head>
        <meta charset="utf-8" />
        <title>Liječnički pregledi</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 20px;
            color: #111827;
          }
          h1 {
            margin: 0 0 5px;
            font-size: 24px;
          }
          h3 {
            margin: 0;
            color: #4b5563;
          }
          .meta {
            margin-top: 12px;
            color: #4b5563;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            font-size: 12px;
            text-align: left;
            vertical-align: top;
          }
          th { background: #f3f4f6; }
          button {
            margin-bottom: 16px;
            padding: 8px 12px;
          }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Ispiši / spremi kao PDF</button>

        <h1>${escapeHtml(tvrtka?.naziv || "")}</h1>
        <h3>Liječnički pregledi</h3>
        <div class="meta">Broj pregleda: ${pregledi.length}</div>

        <table>
          <thead>
            <tr>
              <th>Ime i prezime</th>
              <th>OIB</th>
              <th>Datum pregleda</th>
              <th>Ističe</th>
              <th>Napomena</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows ||
              `<tr><td colspan="5">Nema liječničkih pregleda za prikaz.</td></tr>`
            }
          </tbody>
        </table>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("GET /api/ispis/lijecnicki error:", error);
    return new Response("Greška kod ispisa liječničkih pregleda.", {
      status: 500,
    });
  }
}
