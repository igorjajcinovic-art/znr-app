import {
  ensureVatrogasniAparatiTable,
  type VatrogasniAparat,
} from "@/lib/fire-extinguishers";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}.${d.getUTCFullYear()}.`;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(req: Request) {
  try {
    await ensureVatrogasniAparatiTable();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const [tvrtka, aparati] = await Promise.all([
      prisma.tvrtka.findUnique({
        where: { id: firmaId },
      }),
      prisma.$queryRaw<VatrogasniAparat[]>`
        SELECT * FROM "VatrogasniAparat"
        WHERE "firmaId" = ${firmaId}
        ORDER BY "lokacija" ASC, "oznaka" ASC
      `,
    ]);

    if (!tvrtka) {
      return new Response("Tvrtka nije pronađena.", { status: 404 });
    }

    const rows = aparati
      .map(
        (aparat, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(aparat.oznaka)}</td>
            <td>${escapeHtml(aparat.lokacija)}</td>
            <td>${escapeHtml(aparat.vrsta || "-")}</td>
            <td>${escapeHtml(aparat.proizvodjac || "-")}</td>
            <td>${escapeHtml(aparat.tvornickiBroj || "-")}</td>
            <td>${escapeHtml(formatDate(aparat.datumRedovnogPregleda))}</td>
            <td>${escapeHtml(formatDate(aparat.sljedeciRedovniPregled))}</td>
            <td>${escapeHtml(formatDate(aparat.datumPeriodicnogPregleda))}</td>
            <td>${escapeHtml(formatDate(aparat.sljedeciPeriodicniPregled))}</td>
            <td>${escapeHtml(aparat.status)}</td>
            <td>${escapeHtml(aparat.napomena || "")}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html lang="hr">
        <head>
          <meta charset="utf-8" />
          <title>Upisnik vatrogasnih aparata</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 24px;
              color: #111827;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 18px;
              margin-bottom: 20px;
            }
            h1 {
              margin: 0 0 8px 0;
              font-size: 26px;
              text-transform: uppercase;
            }
            h2 {
              margin: 0;
              font-size: 17px;
              color: #4b5563;
              font-weight: 600;
            }
            .meta {
              min-width: 260px;
              border: 1px solid #d1d5db;
              padding: 12px;
              font-size: 12px;
            }
            .meta div {
              margin-bottom: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 18px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 7px;
              font-size: 11px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            .footer {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 48px;
              margin-top: 42px;
              font-size: 12px;
            }
            .line {
              border-top: 1px solid #111827;
              padding-top: 8px;
              text-align: center;
            }
            @media print {
              body { margin: 12mm; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" style="margin-bottom: 16px; padding: 8px 12px;">
            Ispiši / spremi kao PDF
          </button>

          <div class="header">
            <div>
              <h1>Upisnik vatrogasnih aparata</h1>
              <h2>${escapeHtml(tvrtka.naziv)}</h2>
            </div>
            <div class="meta">
              <div><strong>OIB:</strong> ${escapeHtml(tvrtka.oib)}</div>
              <div><strong>Adresa:</strong> ${escapeHtml(tvrtka.adresa || "-")}</div>
              <div><strong>Datum ispisa:</strong> ${escapeHtml(formatDate(new Date()))}</div>
              <div><strong>Broj aparata:</strong> ${aparati.length}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>R.br.</th>
                <th>Oznaka</th>
                <th>Lokacija</th>
                <th>Vrsta</th>
                <th>Proizvođač</th>
                <th>Tvornički broj</th>
                <th>Datum redovnog pregleda</th>
                <th>Sljedeći redovni pregled</th>
                <th>Datum periodičkog pregleda</th>
                <th>Sljedeći periodički pregled</th>
                <th>Status</th>
                <th>Napomena</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows ||
                `<tr><td colspan="12">Nema upisanih vatrogasnih aparata.</td></tr>`
              }
            </tbody>
          </table>

          <div class="footer">
            <div class="line">Sastavio</div>
            <div class="line">Odgovorna osoba</div>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("GET /api/ispis/vatrogasni-aparati error:", error);
    return new Response("Ne mogu izraditi upisnik vatrogasnih aparata.", {
      status: 500,
    });
  }
}
