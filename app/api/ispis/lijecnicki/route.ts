import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId");

    if (!firmaId) {
      return new Response("Nedostaje firmaId.", { status: 400 });
    }

    const tvrtka = await prisma.tvrtka.findUnique({
      where: { id: firmaId },
    });

    const pregledi = await prisma.lijecnickiPregled.findMany({
      where: { firmaId },
      orderBy: { vrijediDo: "asc" },
    });

    const html = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: Arial; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${tvrtka?.naziv || ""}</h1>
        <h3>Liječnički pregledi</h3>

        <table>
          <tr>
            <th>OIB</th>
            <th>Vrsta</th>
            <th>Datum</th>
            <th>Vrijedi do</th>
          </tr>

          ${pregledi
            .map(
              (p) => `
              <tr>
                <td>${p.oib}</td>
                <td>${p.vrsta || ""}</td>
                <td>${new Date(p.datum).toLocaleDateString()}</td>
                <td>${new Date(p.vrijediDo).toLocaleDateString()}</td>
              </tr>
            `
            )
            .join("")}
        </table>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new Response("Greška kod ispisa.", { status: 500 });
  }
}