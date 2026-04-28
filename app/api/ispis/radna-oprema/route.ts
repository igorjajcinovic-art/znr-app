import { prisma } from "@/lib/prisma";

function parseDate(value: string | null | Date | undefined): string {
  if (!value) return "-";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "-";
    return `${String(value.getDate()).padStart(2, "0")}.${String(
      value.getMonth() + 1
    ).padStart(2, "0")}.${value.getFullYear()}`;
  }

  const v = String(value).trim();
  if (!v) return "-";

  if (v.includes("T")) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
        d.getUTCMonth() + 1
      ).padStart(2, "0")}.${d.getUTCFullYear()}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-");
    return `${d}.${m}.${y}`;
  }

  const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
  if (dots) {
    const [, d, m, y] = dots;
    return `${d.padStart(2, "0")}.${m.padStart(2, "0")}.${y}`;
  }

  return v;
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;

  const raw =
    value instanceof Date
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(value.getDate()).padStart(2, "0")}`
      : String(value).includes("T")
      ? String(value).split("T")[0]
      : String(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const [y, m, d] = raw.split("-");
  const target = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const targetOnly = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  );

  return Math.ceil(
    (targetOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function servisStatus(value: string | Date | null | undefined) {
  const diff = daysUntil(value);

  if (diff === null) {
    return {
      text: "Nema definiranog servisa",
      bg: "#f3f4f6",
      color: "#374151",
      border: "#d1d5db",
    };
  }

  if (diff < 0) {
    return {
      text: `Isteklo prije ${Math.abs(diff)} dana`,
      bg: "#fee2e2",
      color: "#991b1b",
      border: "#f87171",
    };
  }

  if (diff <= 30) {
    return {
      text: `Servis za ${diff} dana`,
      bg: "#fef3c7",
      color: "#92400e",
      border: "#fbbf24",
    };
  }

  return {
    text: `Važi još ${diff} dana`,
    bg: "#dcfce7",
    color: "#166534",
    border: "#4ade80",
  };
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

    const ukupno = zapisi.length;
    const aktivno = zapisi.filter((z) => z.status === "aktivno").length;
    const neispravno = zapisi.filter((z) => z.status === "neispravno").length;
    const naServisu = zapisi.filter((z) => z.status === "na servisu").length;
    const servisUpozorenja = zapisi.filter((z) => {
      const diff = daysUntil(z.sljedeciServis);
      return diff !== null && diff <= 30;
    }).length;

    const rows = zapisi
      .map((z, index) => {
        const status = servisStatus(z.sljedeciServis);

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(z.naziv)}</td>
            <td>${escapeHtml(z.tip)}</td>
            <td>${escapeHtml(z.serijskiBroj ?? "-")}</td>
            <td>${escapeHtml(z.inventarniBroj ?? "-")}</td>
            <td>${escapeHtml(z.proizvodjac ?? "-")}</td>
            <td>${escapeHtml(z.model ?? "-")}</td>
            <td>${escapeHtml(parseDate(z.datumNabave))}</td>
            <td>${escapeHtml(parseDate(z.datumServisa))}</td>
            <td>${escapeHtml(parseDate(z.sljedeciServis))}</td>
            <td>
              <span class="status-pill">
                ${escapeHtml(z.status)}
              </span>
            </td>
            <td>
              <span class="servis-pill" style="background:${status.bg};color:${status.color};border-color:${status.border};">
                ${escapeHtml(status.text)}
              </span>
            </td>
            <td>${escapeHtml(z.napomena ?? "-")}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html lang="hr">
        <head>
          <meta charset="utf-8" />
          <title>Ispis radne opreme</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              margin: 24px;
              color: #111827;
            }
            h1 {
              margin: 0 0 8px 0;
              font-size: 28px;
            }
            h2 {
              margin: 0 0 24px 0;
              font-size: 18px;
              color: #4b5563;
              font-weight: 600;
            }
            .meta {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 24px;
            }
            .card {
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 14px;
              background: #f9fafb;
            }
            .label {
              font-size: 12px;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 6px;
              font-weight: 700;
            }
            .value {
              font-size: 22px;
              font-weight: 800;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            .status-pill, .servis-pill {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 999px;
              border: 1px solid #d1d5db;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
            }
            .status-pill {
              background: #e5e7eb;
              color: #111827;
            }
            .footer {
              margin-top: 20px;
              color: #6b7280;
              font-size: 12px;
            }
            @media print {
              body {
                margin: 10mm;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom:16px;">
            <button onclick="window.print()" style="padding:10px 16px;border:none;border-radius:8px;background:#111827;color:white;font-weight:700;cursor:pointer;">
              Ispis
            </button>
          </div>

          <h1>Radna oprema i strojevi</h1>
          <h2>${escapeHtml(tvrtka.naziv)} • OIB: ${escapeHtml(tvrtka.oib)}</h2>

          <div class="meta">
            <div class="card">
              <div class="label">Ukupno zapisa</div>
              <div class="value">${ukupno}</div>
            </div>
            <div class="card">
              <div class="label">Aktivno</div>
              <div class="value">${aktivno}</div>
            </div>
            <div class="card">
              <div class="label">Neispravno</div>
              <div class="value">${neispravno}</div>
            </div>
            <div class="card">
              <div class="label">Servis upozorenja</div>
              <div class="value">${servisUpozorenja}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Naziv</th>
                <th>Tip</th>
                <th>Tvornički broj</th>
                <th>Inventarni broj</th>
                <th>Proizvođač</th>
                <th>Model</th>
                <th>Datum nabave</th>
                <th>Zadnji servis</th>
                <th>Sljedeći servis</th>
                <th>Status</th>
                <th>Servis</th>
                <th>Napomena</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="13">Nema zapisa.</td></tr>`}
            </tbody>
          </table>

          <div class="footer">
            Generirano: ${escapeHtml(parseDate(new Date()))}
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Ne mogu generirati ispis radne opreme.", {
      status: 500,
    });
  }
}