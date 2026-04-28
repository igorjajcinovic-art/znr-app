import { prisma } from "@/lib/prisma";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
    d.getUTCMonth() + 1
  ).padStart(2, "0")}.${d.getUTCFullYear()}`;
}

function daysUntil(value: Date | string | null | undefined) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const target = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const today = new Date();
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return Math.ceil(
    (target.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function statusRoka(value: Date | string | null | undefined) {
  const diff = daysUntil(value);

  if (diff === null) return "-";
  if (diff < 0) return `Isteklo prije ${Math.abs(diff)} dana`;
  if (diff <= 30) return `Istječe za ${diff} dana`;
  return `Važi još ${diff} dana`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const [tvrtka, oprema, radnici] = await Promise.all([
      prisma.tvrtka.findUnique({
        where: { id: firmaId },
      }),
      prisma.oprema.findMany({
        where: { firmaId },
        orderBy: [{ rokZamjene: "asc" }, { datumIzdavanja: "desc" }],
      }),
      prisma.radnik.findMany({
        where: { firmaId },
      }),
    ]);

    const getIme = (oib: string) =>
      radnici.find((r) => r.oib === oib)?.ime || oib;

    const html = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Osobna zaštitna oprema</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin-bottom: 6px; }
          h3 { margin-top: 0; color: #4b5563; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${tvrtka?.naziv || ""}</h1>
        <h3>Osobna zaštitna oprema</h3>

        <table>
          <tr>
            <th>Radnik</th>
            <th>OIB</th>
            <th>Vrsta</th>
            <th>Datum izdavanja</th>
            <th>Količina</th>
            <th>Rok zamjene</th>
            <th>Status</th>
            <th>Napomena</th>
          </tr>

          ${oprema
            .map(
              (z) => `
              <tr>
                <td>${getIme(z.oib)}</td>
                <td>${z.oib}</td>
                <td>${z.vrsta}</td>
                <td>${formatDate(z.datumIzdavanja)}</td>
                <td>${z.kolicina}</td>
                <td>${formatDate(z.rokZamjene)}</td>
                <td>${statusRoka(z.rokZamjene)}</td>
                <td>${z.napomena || ""}</td>
              </tr>
            `
            )
            .join("")}
        </table>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error(error);
    return new Response("Greška kod ispisa opreme.", { status: 500 });
  }
}