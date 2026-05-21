import { formatHrDateValue } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { ensureRadnikUlicaColumn } from "@/lib/workers";

type RadnikRow = {
  id: string;
  firmaId: string;
  ime: string;
  oib: string;
  datumZaposlenja: Date;
  grad: string | null;
  ulica: string | null;
  radnoMjesto: string | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textParam(searchParams: URLSearchParams, name: string, fallback = "") {
  return searchParams.get(name)?.trim() || fallback;
}

function dateParam(searchParams: URLSearchParams, name: string, fallback: Date | null) {
  const value = searchParams.get(name)?.trim();
  return value || formatHrDateValue(fallback);
}

export async function GET(req: Request) {
  try {
    await ensureRadnikUlicaColumn();

    const { searchParams } = new URL(req.url);
    const firmaId = searchParams.get("firmaId")?.trim();
    const radnikId = searchParams.get("radnikId")?.trim();

    if (!firmaId || !radnikId) {
      return new Response("Nedostaje firmaId ili radnikId.", { status: 400 });
    }

    const [tvrtka, radnici] = await Promise.all([
      prisma.tvrtka.findUnique({ where: { id: firmaId } }),
      prisma.$queryRaw<RadnikRow[]>`
        SELECT "id", "firmaId", "ime", "oib", "datumZaposlenja", "grad", "ulica", "radnoMjesto"
        FROM "Radnik"
        WHERE "id" = ${radnikId} AND "firmaId" = ${firmaId}
        LIMIT 1
      `,
    ]);

    const radnik = radnici[0];

    if (!tvrtka || !radnik) {
      return new Response("Tvrtka ili radnik nisu pronađeni.", { status: 404 });
    }

    const direktor = textParam(searchParams, "direktor", "direktor");
    const datumUgovora = dateParam(searchParams, "datumUgovora", new Date());
    const pocetakRada = dateParam(searchParams, "pocetakRada", radnik.datumZaposlenja);
    const probniRok = textParam(searchParams, "probniRok", "6 (šest) mjeseci");
    const mjestoRada = textParam(searchParams, "mjestoRada", tvrtka.adresa || "");
    const placa = textParam(searchParams, "placa", "1.050,00 € bruto");
    const radnoMjesto = textParam(
      searchParams,
      "radnoMjesto",
      radnik.radnoMjesto || "radnik"
    );
    const radnikAdresa = [radnik.ulica, radnik.grad].filter(Boolean).join(", ");

    const html = `<!doctype html>
      <html lang="hr">
      <head>
        <meta charset="utf-8" />
        <title>Ugovor o radu - ${escapeHtml(radnik.ime)}</title>
        <style>
          @page { size: A4; margin: 18mm 18mm 16mm; }
          body {
            font-family: "Times New Roman", serif;
            color: #111;
            font-size: 12pt;
            line-height: 1.45;
          }
          .toolbar {
            position: sticky;
            top: 0;
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            padding: 10px 0;
            background: white;
            border-bottom: 1px solid #ddd;
            margin-bottom: 18px;
          }
          button {
            border: 0;
            background: #111827;
            color: white;
            padding: 10px 14px;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
          }
          h1 {
            text-align: center;
            font-size: 16pt;
            margin: 22px 0 4px;
            text-transform: uppercase;
          }
          h2 {
            text-align: center;
            font-size: 13pt;
            margin: 0 0 18px;
            text-transform: uppercase;
          }
          h3 {
            font-size: 12pt;
            margin: 18px 0 6px;
            text-align: center;
          }
          .article-title {
            font-weight: 700;
            text-align: center;
            margin-top: 12px;
          }
          p { margin: 0 0 10px; text-align: justify; }
          .intro { margin-bottom: 18px; }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 70px;
            margin-top: 46px;
            text-align: center;
          }
          .line {
            border-top: 1px solid #111;
            padding-top: 8px;
            margin-top: 46px;
          }
          .mp { text-align: center; margin-top: 24px; }
          @media print {
            .toolbar { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button onclick="window.print()">Ispiši / spremi PDF</button>
        </div>

        <p class="intro">
          <strong>${escapeHtml(tvrtka.naziv)}</strong>, ${escapeHtml(tvrtka.adresa || "")},
          OIB: ${escapeHtml(tvrtka.oib)}, koju zastupa ${escapeHtml(direktor)}
          (u daljnjem tekstu: poslodavac)
        </p>

        <p class="intro">
          i <strong>${escapeHtml(radnik.ime)}</strong>, ${escapeHtml(radnikAdresa || "-")},
          OIB: ${escapeHtml(radnik.oib)} (u daljnjem tekstu: radnik)
          sklopili su dana ${escapeHtml(datumUgovora)} godine sljedeći
        </p>

        <h1>Ugovor o radu</h1>
        <h2>na neodređeno vrijeme</h2>

        <h3>Uvodne odredbe</h3>
        <div class="article-title">Članak 1.</div>
        <p>Ovim ugovorom poslodavac se obvezuje radniku dati posao i za obavljeni rad mu isplatiti plaću, a radnik se obvezuje preuzete poslove obavljati osobno poštujući upute poslodavca i vodeći računa o zaštiti interesa poslodavca.</p>

        <div class="article-title">Članak 2.</div>
        <p>Ugovor o radu sklapa se na neodređeno vrijeme s probnim rokom u trajanju od ${escapeHtml(probniRok)}.</p>
        <p>Radnik započinje s radom ${escapeHtml(pocetakRada)} godine.</p>

        <div class="article-title">Članak 3.</div>
        <p>Radnik će obavljati poslove <strong>${escapeHtml(radnoMjesto)}</strong>, utvrđene i opisane aktima poslodavca.</p>
        <p>Radnik svojim potpisom potvrđuje da je prilikom sklapanja ovog ugovora upoznat s opisom poslova radnog mjesta i obvezama vezanim za izvršenje istog.</p>
        <p>Radnik se obvezuje, po nalogu i uputi poslodavca, obavljati i druge poslove koji su u skladu s naravi i vrstom poslova iz stavka 1. ovog članka.</p>

        <h3>Mjesto rada</h3>
        <div class="article-title">Članak 4.</div>
        <p>Radnik će poslove iz članka 3. obavljati u ${escapeHtml(mjestoRada)}, a po potrebi i nalogu poslodavca i u drugim mjestima u kojima poslodavac obavlja djelatnost.</p>

        <h3>Radno vrijeme</h3>
        <div class="article-title">Članak 5.</div>
        <p>Radnik se obvezuje raditi u punom radnom vremenu od 40 sati tjedno. Početak i završetak radnog vremena određuje poslodavac.</p>

        <div class="article-title">Članak 6.</div>
        <p>U tijeku rada radnik će koristiti odmor (stanku) od 30 minuta. Vrijeme korištenja prava na stanku određuje poslodavac.</p>

        <h3>Godišnji odmor</h3>
        <div class="article-title">Članak 7.</div>
        <p>Radnik ima pravo na godišnji odmor pod uvjetima i u trajanju utvrđenom Pravilnikom o radu i važećim propisima.</p>

        <h3>Plaća i naknade plaće</h3>
        <div class="article-title">Članak 8.</div>
        <p>Za obavljeni rad na temelju ovog ugovora u redovitom radnom vremenu poslodavac će obračunati i isplatiti radniku osnovnu plaću u visini od ${escapeHtml(placa)}.</p>
        <p>Radnik ima pravo na dodatke na plaću u slučajevima i visini utvrđenim Pravilnikom o radu.</p>

        <div class="article-title">Članak 9.</div>
        <p>U slučaju opravdane odsutnosti s rada, radnik ima pravo na naknadu plaće u visini utvrđenoj Pravilnikom o radu. Plaća ili naknada plaće isplaćuje se u razdoblju i rokovima utvrđenim Pravilnikom o radu.</p>

        <h3>Otkaz ugovora o radu</h3>
        <div class="article-title">Članak 10.</div>
        <p>Ugovorne strane mogu ovaj ugovor otkazati pod uvjetima i na način propisan Zakonom o radu i Pravilnikom o radu. Otkaz mora biti u pisanom obliku.</p>
        <p>U slučaju redovitog otkaza primjenjuje se otkazni rok utvrđen važećim propisima, osim ako poslodavac radnika pisanom odlukom oslobodi obveze rada tijekom otkaznog roka.</p>

        <h3>Ugovorna kazna</h3>
        <div class="article-title">Članak 11.</div>
        <p>Ako radnik prestane raditi prije isteka otkaznog roka, bez da je od strane poslodavca oslobođen te obveze, primjenjuju se odredbe Pravilnika o radu i važećih propisa o odgovornosti radnika i naknadi štete, odnosno ugovornoj kazni ako je ista valjano ugovorena.</p>

        <h3>Prava i obveze iz radnog odnosa</h3>
        <div class="article-title">Članak 12.</div>
        <p>Na prava i obveze na koje odredbe ovog ugovora upućuju, kao i na sva druga prava i obveze iz radnog odnosa koja nisu regulirana ovim ugovorom, neposredno se primjenjuju odredbe Pravilnika o radu te važećeg Zakona o radu.</p>

        <div class="article-title">Članak 13.</div>
        <p>Radnik izjavljuje da ga je poslodavac upoznao s organizacijom rada i zaštitom na radu, te da je upoznat s odredbama Pravilnika o radu i drugim aktima poslodavca.</p>
        <p>Svojim potpisom na ovom ugovoru radnik potvrđuje da je upoznat s korištenjem video nadzora ako se isti koristi u prostorima poslodavca, u svrhu sigurnosti, kontrole ulaska i izlaska te zaštite na radu, u skladu s važećim propisima.</p>

        <div class="article-title">Članak 14.</div>
        <p>Stranke svojim potpisom potvrđuju da prihvaćaju prava i obveze utvrđene ovim ugovorom, da su suglasne sa svim odredbama ugovora, te da su iste izraz njihove stvarne i slobodne volje.</p>

        <h3>Završne odredbe</h3>
        <div class="article-title">Članak 15.</div>
        <p>Ovaj ugovor je sklopljen u dva jednaka primjerka od kojih jedan primjerak zadržava radnik, a jedan primjerak poslodavac.</p>

        <div class="article-title">Članak 16.</div>
        <p>Ovaj ugovor stupa na snagu danom potpisivanja. Stupanjem na snagu ovog ugovora prestaju važiti svi prethodno sklopljeni ugovori između radnika i poslodavca.</p>

        <div class="signatures">
          <div>
            <strong>Poslodavac</strong>
            <div class="line">${escapeHtml(tvrtka.naziv)}</div>
          </div>
          <div>
            <strong>Radnik</strong>
            <div class="line">${escapeHtml(radnik.ime)}</div>
          </div>
        </div>
        <div class="mp">M.P.</div>
      </body>
      </html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("GET /api/ispis/ugovor-rad error:", error);
    return new Response("Ne mogu napraviti ugovor o radu.", { status: 500 });
  }
}
