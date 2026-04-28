"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
};

type Radnik = {
  id: string;
  firmaId: string;
  ime: string;
  oib: string;
  aktivan: boolean;
  datumOdjave: string | null;
  datumZaposlenja: string;
  datumRodjenja: string | null;
  grad: string | null;
  radnoMjesto: string | null;
  imaDozvolu: boolean;
  dozvolaDo: string | null;
  znrOsposobljen: boolean;
  znrDatum: string | null;
  zopOsposobljen: boolean;
  zopDatum: string | null;
};

type Pregled = {
  id: string;
  firmaId: string;
  oib: string;
  vrsta: string | null;
  datum: string;
  vrijediDo: string;
  napomena: string | null;
};

type Osposobljavanje = {
  id: string;
  firmaId: string;
  oib: string;
  vrsta: string;
  datum: string;
  vrijediDo: string;
  napomena: string | null;
};

type OzoOprema = {
  id: string;
  firmaId: string;
  oib: string;
  vrsta: string;
  datumIzdavanja: string;
  kolicina: number;
  rokZamjene: string | null;
  napomena: string | null;
};

type RadnaOprema = {
  id: string;
  firmaId: string;
  naziv: string;
  tip: string;
  serijskiBroj: string | null;
  inventarniBroj: string | null;
  proizvodjac: string | null;
  model: string | null;
  datumNabave: string | null;
  datumServisa: string | null;
  sljedeciServis: string | null;
  status: string;
  napomena: string | null;
};

type PlanerItem = {
  id: string;
  firmaId: string;
  naziv: string;
  opis: string | null;
  datum: string;
  tip: string;
  status: string;
  radnikId: string | null;
  opremaId: string | null;
};

export default function TvrtkaDetaljiPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [pregledi, setPregledi] = useState<Pregled[]>([]);
  const [osposobljavanja, setOsposobljavanja] = useState<Osposobljavanje[]>(
    []
  );
  const [oprema, setOprema] = useState<OzoOprema[]>([]);
  const [radnaOprema, setRadnaOprema] = useState<RadnaOprema[]>([]);
  const [planer, setPlaner] = useState<PlanerItem[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  const ucitajSve = async () => {
    try {
      setGreska("");
      setUcitavanje(true);

      const [
        tvrtkeRes,
        radniciRes,
        preglediRes,
        osposobljavanjaRes,
        opremaRes,
        radnaOpremaRes,
        planerRes,
      ] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/lijecnicki?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/osposobljavanja?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/oprema?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/radna-oprema?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/planer?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }).catch(() => null),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtke.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!preglediRes.ok) throw new Error("Ne mogu učitati liječničke.");
      if (!osposobljavanjaRes.ok) {
        throw new Error("Ne mogu učitati osposobljavanja.");
      }
      if (!opremaRes.ok) throw new Error("Ne mogu učitati zaštitnu opremu.");
      if (!radnaOpremaRes.ok) {
        throw new Error("Ne mogu učitati radnu opremu i strojeve.");
      }

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const preglediData: Pregled[] = await preglediRes.json();
      const osposobljavanjaData: Osposobljavanje[] =
        await osposobljavanjaRes.json();
      const opremaData: OzoOprema[] = await opremaRes.json();
      const radnaOpremaData: RadnaOprema[] = await radnaOpremaRes.json();

      let planerData: PlanerItem[] = [];
      if (planerRes && planerRes.ok) {
        try {
          planerData = await planerRes.json();
        } catch {
          planerData = [];
        }
      }

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;

      if (!nadenaTvrtka) {
        throw new Error("Tvrtka nije pronađena.");
      }

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);
      setPregledi(preglediData);
      setOsposobljavanja(osposobljavanjaData);
      setOprema(opremaData);
      setRadnaOprema(radnaOpremaData);
      setPlaner(planerData);
    } catch (err) {
      setGreska(
        err instanceof Error ? err.message : "Greška pri učitavanju."
      );
    } finally {
      setUcitavanje(false);
    }
  };

  const parseDate = (value: string | null): string => {
    if (!value) return "";

    const v = value.trim();

    if (v.includes("T")) return v.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const matchDots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
    if (matchDots) {
      const [, d, m, y] = matchDots;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return "";
  };

  const daysUntil = (value: string | null): number | null => {
    const iso = parseDate(value);
    if (!iso) return null;

    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return null;

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
  };

  const istjeceUskoroIliIsteklo = (datum: string | null) => {
    const diff = daysUntil(datum);
    return diff !== null && diff <= 30;
  };

  const brojAktivnih = useMemo(
    () => radnici.filter((r) => r.aktivan).length,
    [radnici]
  );

  const brojNeaktivnih = useMemo(
    () => radnici.filter((r) => !r.aktivan).length,
    [radnici]
  );

  const brojDozvolaUpozorenja = useMemo(
    () =>
      radnici.filter(
        (r) => r.imaDozvolu && istjeceUskoroIliIsteklo(r.dozvolaDo)
      ).length,
    [radnici]
  );

  const brojLijecnickihUpozorenja = useMemo(
    () => pregledi.filter((p) => istjeceUskoroIliIsteklo(p.vrijediDo)).length,
    [pregledi]
  );

  const brojOsposobljavanjaUpozorenja = useMemo(
    () =>
      osposobljavanja.filter((o) => istjeceUskoroIliIsteklo(o.vrijediDo)).length,
    [osposobljavanja]
  );

  const brojOpremaUpozorenja = useMemo(
    () =>
      oprema.filter((o) => o.rokZamjene && istjeceUskoroIliIsteklo(o.rokZamjene))
        .length,
    [oprema]
  );

  const brojRadnaOpremaUpozorenja = useMemo(
    () =>
      radnaOprema.filter(
        (o) => o.sljedeciServis && istjeceUskoroIliIsteklo(o.sljedeciServis)
      ).length,
    [radnaOprema]
  );

  const ukupnoUpozorenja =
    brojDozvolaUpozorenja +
    brojLijecnickihUpozorenja +
    brojOsposobljavanjaUpozorenja +
    brojOpremaUpozorenja +
    brojRadnaOpremaUpozorenja;

  const modules = [
    {
      naziv: "Radnici",
      opis: "Pregled, unos, uređivanje, povijest i CSV uvoz/izvoz radnika.",
      href: `/tvrtke/${firmaId}/radnici`,
      broj: radnici.length,
      oznaka: "ukupno",
    },
    {
      naziv: "Liječnički pregledi",
      opis: "Evidencija pregleda, rokova i upozorenja za liječničke preglede.",
      href: `/tvrtke/${firmaId}/lijecnicki`,
      broj: pregledi.length,
      oznaka: "zapisa",
    },
    {
      naziv: "Stručna osposobljavanja",
      opis: "Praćenje osposobljavanja, rokova valjanosti i svih statusa.",
      href: `/tvrtke/${firmaId}/osposobljavanja`,
      broj: osposobljavanja.length,
      oznaka: "zapisa",
    },
    {
      naziv: "Osobna zaštitna oprema",
      opis: "Zaduženje opreme, rokovi zamjene i pregled stanja po radniku.",
      href: `/tvrtke/${firmaId}/oprema`,
      broj: oprema.length,
      oznaka: "zapisa",
    },
    {
      naziv: "Radna oprema i strojevi",
      opis: "Evidencija strojeva, alata i druge radne opreme po tvrtki.",
      href: `/tvrtke/${firmaId}/radna-oprema`,
      broj: radnaOprema.length,
      oznaka: "zapisa",
    },
    {
      naziv: "Planer",
      opis: "Planiranje liječničkih pregleda, servisa, ispitivanja i drugih obaveza.",
      href: `/tvrtke/${firmaId}/planer`,
      broj: planer.length,
      oznaka: "stavki",
    },
  ];

  if (ucitavanje) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={loadingBoxStyle}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (greska || !tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={heroCardStyle}>
            <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
              Tvrtka nije pronađena
            </h1>

            <p style={{ marginBottom: 16 }}>
              {greska || "Otvorena tvrtka ne postoji u bazi."}
            </p>

            <Link href="/tvrtke" style={primaryLinkStyle}>
              Natrag na tvrtke
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/tvrtke" style={backLinkStyle}>
            ← Natrag na tvrtke
          </Link>
        </div>

        <div style={heroCardStyle}>
          <div style={heroTopRowStyle}>
            <div>
              <div style={heroBadgeStyle}>Dashboard tvrtke</div>
              <h1 style={heroTitleStyle}>{tvrtka.naziv}</h1>
              <div style={heroMetaStyle}>
                <div>
                  <strong>OIB:</strong> {tvrtka.oib}
                </div>
                <div>
                  <strong>Adresa:</strong> {tvrtka.adresa || "-"}
                </div>
              </div>
            </div>

            <div style={heroWarningBoxStyle}>
              <div style={heroWarningLabelStyle}>Ukupno upozorenja</div>
              <div style={heroWarningValueStyle}>{ukupnoUpozorenja}</div>
            </div>
          </div>

          <div style={printActionsWrapStyle}>
            <a
              href={`/api/ispis/radnici?firmaId=${tvrtka.id}`}
              target="_blank"
              style={printButtonStyle}
            >
              Ispis radnika
            </a>

            <a
              href={`/api/ispis/lijecnicki?firmaId=${tvrtka.id}`}
              target="_blank"
              style={printButtonStyle}
            >
              Ispis liječničkih
            </a>

            <a
              href={`/api/ispis/osposobljavanja?firmaId=${tvrtka.id}`}
              target="_blank"
              style={printButtonStyle}
            >
              Ispis osposobljavanja
            </a>

            <a
              href={`/api/ispis/oprema?firmaId=${tvrtka.id}`}
              target="_blank"
              style={printButtonStyle}
            >
              Ispis opreme
            </a>

            <a
              href={`/api/ispis/radna-oprema?firmaId=${tvrtka.id}`}
              target="_blank"
              style={printButtonStyle}
            >
              Ispis radne opreme
            </a>

            <a
              href={`/api/radna-oprema/export?firmaId=${tvrtka.id}`}
              style={printButtonStyle}
            >
              Export radne opreme CSV
            </a>

            <Link href="/upozorenja" style={secondaryLinkStyle}>
              Sva upozorenja
            </Link>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatKartica naslov="Ukupno radnika" vrijednost={radnici.length} />
          <StatKartica naslov="Aktivni radnici" vrijednost={brojAktivnih} />
          <StatKartica naslov="Neaktivni radnici" vrijednost={brojNeaktivnih} />
          <StatKartica
            naslov="Dozvole - upozorenja"
            vrijednost={brojDozvolaUpozorenja}
            highlight={brojDozvolaUpozorenja > 0}
          />
          <StatKartica
            naslov="Liječnički - upozorenja"
            vrijednost={brojLijecnickihUpozorenja}
            highlight={brojLijecnickihUpozorenja > 0}
          />
          <StatKartica
            naslov="Osposobljavanja - upozorenja"
            vrijednost={brojOsposobljavanjaUpozorenja}
            highlight={brojOsposobljavanjaUpozorenja > 0}
          />
          <StatKartica
            naslov="OZO - upozorenja"
            vrijednost={brojOpremaUpozorenja}
            highlight={brojOpremaUpozorenja > 0}
          />
          <StatKartica
            naslov="Strojevi - servis"
            vrijednost={brojRadnaOpremaUpozorenja}
            highlight={brojRadnaOpremaUpozorenja > 0}
          />
        </div>

        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Moduli tvrtke</h2>
          <div style={sectionSubtitleStyle}>
            Odaberi područje u kojem želiš raditi.
          </div>
        </div>

        <div style={modulesGridStyle}>
          {modules.map((module) => (
            <div key={module.naziv} style={moduleCardStyle}>
              <div style={moduleCountPillStyle}>
                {module.broj} {module.oznaka}
              </div>

              <h3 style={moduleTitleStyle}>{module.naziv}</h3>

              <p style={moduleDescriptionStyle}>{module.opis}</p>

              <div style={{ marginTop: "auto" }}>
                <Link href={module.href} style={primaryLinkStyle}>
                  Otvori modul
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatKartica({
  naslov,
  vrijednost,
  highlight = false,
}: {
  naslov: string;
  vrijednost: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        ...statCardStyle,
        ...(highlight
          ? {
              border: "1px solid #fbbf24",
              background: "#fffbeb",
            }
          : {}),
      }}
    >
      <div style={statLabelStyle}>{naslov}</div>
      <div style={statValueStyle}>{vrijednost}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  background: "#f3f4f6",
  minHeight: "100vh",
  padding: 24,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
};

const loadingBoxStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const heroCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 22,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  padding: 28,
  marginBottom: 24,
};

const heroTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 20,
};

const heroBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e5e7eb",
  color: "#111827",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 12,
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  margin: 0,
  marginBottom: 12,
  color: "#111827",
};

const heroMetaStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#374151",
  fontSize: 15,
};

const heroWarningBoxStyle: React.CSSProperties = {
  minWidth: 180,
  background: "#111827",
  color: "white",
  borderRadius: 18,
  padding: 18,
};

const heroWarningLabelStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.85,
  marginBottom: 8,
};

const heroWarningValueStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  lineHeight: 1,
};

const printActionsWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 28,
};

const statCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 22,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 10,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.1,
};

const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  margin: 0,
  marginBottom: 6,
  color: "#111827",
};

const sectionSubtitleStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 15,
};

const modulesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const moduleCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 22,
  minHeight: 220,
  display: "flex",
  flexDirection: "column",
};

const moduleCountPillStyle: React.CSSProperties = {
  display: "inline-block",
  alignSelf: "flex-start",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#f3f4f6",
  color: "#111827",
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 14,
};

const moduleTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  margin: 0,
  marginBottom: 10,
  color: "#111827",
};

const moduleDescriptionStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  lineHeight: 1.5,
  margin: 0,
  marginBottom: 18,
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  background: "#111827",
  color: "white",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  background: "#e5e7eb",
  color: "#111827",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
};

const printButtonStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  background: "black",
  color: "white",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
};