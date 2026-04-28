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

    const radnici = await prisma.radnik.findMany({
      where: { firmaId },
      orderBy: { ime: "asc" },
    });

    const html = `
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Radnici</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h1 { margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ccc; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${tvrtka?.naziv || ""}</h1>
        <h3>Popis radnika</h3>

        <table>
          <tr>
            <th>Ime</th>
            <th>OIB</th>
            <th>Status</th>
          </tr>

          ${radnici
            .map(
              (r) => `
              <tr>
                <td>${r.ime}</td>
                <td>${r.oib}</td>
                <td>${r.aktivan ? "Aktivan" : "Neaktivan"}</td>
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
  } catch (err) {
    return new Response("Greška kod ispisa radnika.", { status: 500 });
  }
}