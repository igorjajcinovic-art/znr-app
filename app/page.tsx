"use client";

import Link from "next/link";
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
  imaDozvolu: boolean;
  dozvolaDo: string | null;
};

type Pregled = {
  id: string;
  firmaId: string;
  oib: string;
  vrijediDo: string;
};

type Osposobljavanje = {
  id: string;
  firmaId: string;
  oib: string;
  vrijediDo: string;
};

type OzoOprema = {
  id: string;
  firmaId: string;
  oib: string;
  rokZamjene: string | null;
};

type RadnaOprema = {
  id: string;
  firmaId: string;
  naziv: string;
  sljedeciServis: string | null;
};

type PlanerItem = {
  id: string;
  firmaId: string;
  naziv: string;
  datum: string;
  status: string;
};

export default function PocetniDashboardPage() {
  const [tvrtke, setTvrtke] = useState<Tvrtka[]>([]);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [lijecnicki, setLijecnicki] = useState<Pregled[]>([]);
  const [osposobljavanja, setOsposobljavanja] = useState<Osposobljavanje[]>([]);
  const [oprema, setOprema] = useState<OzoOprema[]>([]);
  const [radnaOprema, setRadnaOprema] = useState<RadnaOprema[]>([]);
  const [planer, setPlaner] = useState<PlanerItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    ucitajSve();
  }, []);

  const ucitajSve = async () => {
    try {
      setLoading(true);
      setGreska("");

      const [
        tvrtkeRes,
        radniciRes,
        lijecnickiRes,
        osposobljavanjaRes,
        opremaRes,
        radnaOpremaRes,
        planerRes,
      ] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch("/api/radnici", { cache: "no-store" }),
        fetch("/api/lijecnicki", { cache: "no-store" }),
        fetch("/api/osposobljavanja", { cache: "no-store" }),
        fetch("/api/oprema", { cache: "no-store" }),
        fetch("/api/radna-oprema", { cache: "no-store" }),
        fetch("/api/planer", { cache: "no-store" }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtke.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!lijecnickiRes.ok) throw new Error("Ne mogu učitati liječničke.");
      if (!osposobljavanjaRes.ok) {
        throw new Error("Ne mogu učitati osposobljavanja.");
      }
      if (!opremaRes.ok) throw new Error("Ne mogu učitati OZO.");
      if (!radnaOpremaRes.ok) throw new Error("Ne mogu učitati radnu opremu.");
      if (!planerRes.ok) throw new Error("Ne mogu učitati planer.");

      setTvrtke(await tvrtkeRes.json());
      setRadnici(await radniciRes.json());
      setLijecnicki(await lijecnickiRes.json());
      setOsposobljavanja(await osposobljavanjaRes.json());
      setOprema(await opremaRes.json());
      setRadnaOprema(await radnaOpremaRes.json());
      setPlaner(await planerRes.json());
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (value: string | null) => {
    if (!value) return "";

    const v = value.trim();

    if (v.includes("T")) return v.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

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

  const formatDate = (value: string | null) => {
    const iso = parseDate(value);
    if (!iso) return "-";

    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  };

  const isWarning = (value: string | null) => {
    const diff = daysUntil(value);
    return diff !== null && diff <= 30;
  };

  const isLate = (value: string | null) => {
    const diff = daysUntil(value);
    return diff !== null && diff < 0;
  };

  const ukupnoUpozorenja = useMemo(() => {
    const dozvole = radnici.filter(
      (r) => r.imaDozvolu && isWarning(r.dozvolaDo)
    ).length;

    const lij = lijecnicki.filter((p) => isWarning(p.vrijediDo)).length;

    const osp = osposobljavanja.filter((o) => isWarning(o.vrijediDo)).length;

    const ozo = oprema.filter((o) => isWarning(o.rokZamjene)).length;

    const strojevi = radnaOprema.filter((o) =>
      isWarning(o.sljedeciServis)
    ).length;

    const planerBroj = planer.filter(
      (p) => p.status !== "izvrseno" && isWarning(p.datum)
    ).length;

    return dozvole + lij + osp + ozo + strojevi + planerBroj;
  }, [radnici, lijecnicki, osposobljavanja, oprema, radnaOprema, planer]);

  const ukupnoKasni = useMemo(() => {
    const dozvole = radnici.filter(
      (r) => r.imaDozvolu && isLate(r.dozvolaDo)
    ).length;

    const lij = lijecnicki.filter((p) => isLate(p.vrijediDo)).length;

    const osp = osposobljavanja.filter((o) => isLate(o.vrijediDo)).length;

    const ozo = oprema.filter((o) => isLate(o.rokZamjene)).length;

    const strojevi = radnaOprema.filter((o) =>
      isLate(o.sljedeciServis)
    ).length;

    const planerBroj = planer.filter(
      (p) => p.status !== "izvrseno" && isLate(p.datum)
    ).length;

    return dozvole + lij + osp + ozo + strojevi + planerBroj;
  }, [radnici, lijecnicki, osposobljavanja, oprema, radnaOprema, planer]);

  const najblizeStavke = useMemo(() => {
    const stavke: Array<{
      id: string;
      tip: string;
      naziv: string;
      datum: string;
      href: string;
      diff: number | null;
    }> = [];

    planer
      .filter((p) => p.status !== "izvrseno")
      .forEach((p) => {
        stavke.push({
          id: `planer-${p.id}`,
          tip: "Planer",
          naziv: p.naziv,
          datum: p.datum,
          href: `/tvrtke/${p.firmaId}/planer`,
          diff: daysUntil(p.datum),
        });
      });

    lijecnicki.forEach((p) => {
      stavke.push({
        id: `lijecnicki-${p.id}`,
        tip: "Liječnički",
        naziv: p.oib,
        datum: p.vrijediDo,
        href: `/tvrtke/${p.firmaId}/lijecnicki`,
        diff: daysUntil(p.vrijediDo),
      });
    });

    osposobljavanja.forEach((o) => {
      stavke.push({
        id: `osposobljavanje-${o.id}`,
        tip: "Osposobljavanje",
        naziv: o.oib,
        datum: o.vrijediDo,
        href: `/tvrtke/${o.firmaId}/osposobljavanja`,
        diff: daysUntil(o.vrijediDo),
      });
    });

    radnaOprema
      .filter((s) => s.sljedeciServis)
      .forEach((s) => {
        stavke.push({
          id: `stroj-${s.id}`,
          tip: "Radna oprema",
          naziv: s.naziv,
          datum: s.sljedeciServis || "",
          href: `/tvrtke/${s.firmaId}/radna-oprema/${s.id}`,
          diff: daysUntil(s.sljedeciServis),
        });
      });

    return stavke
      .filter((s) => s.diff !== null)
      .sort((a, b) => Number(a.diff) - Number(b.diff))
      .slice(0, 8);
  }, [planer, lijecnicki, osposobljavanja, radnaOprema]);

  if (loading) {
    return <div style={cardStyle}>Učitavanje dashboarda...</div>;
  }

  return (
    <div>
      <div style={heroCardStyle}>
        <div>
          <div style={badgeStyle}>Početni dashboard</div>
          <h1 style={heroTitleStyle}>Dobrodošli u ZNR aplikaciju</h1>
          <div style={heroTextStyle}>
            Brzi pregled tvrtki, radnika, upozorenja i obaveza.
          </div>
        </div>

        <div style={heroActionsStyle}>
          <Link href="/tvrtke" style={primaryLinkStyle}>
            Otvori tvrtke
          </Link>

          <a href="/api/backup" style={secondaryLinkStyle}>
            Izvoz cijele baze
          </a>
        </div>
      </div>

      {greska ? <div style={errorStyle}>{greska}</div> : null}

      <div style={statsGridStyle}>
        <StatCard naslov="Tvrtke" vrijednost={tvrtke.length} />
        <StatCard naslov="Radnici" vrijednost={radnici.length} />
        <StatCard naslov="Upozorenja" vrijednost={ukupnoUpozorenja} warning />
        <StatCard naslov="Kasni" vrijednost={ukupnoKasni} danger />
      </div>

      <div style={gridTwoStyle}>
        <div style={cardStyle}>
          <div style={sectionTopStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Najbliže obaveze</h2>
              <div style={mutedStyle}>Prvih 8 rokova po datumu.</div>
            </div>
          </div>

          {najblizeStavke.length === 0 ? (
            <div style={emptyStyle}>Nema nadolazećih stavki.</div>
          ) : (
            <div style={listStyle}>
              {najblizeStavke.map((item) => (
                <Link key={item.id} href={item.href} style={listItemStyle}>
                  <div>
                    <div style={itemTitleStyle}>{item.naziv}</div>
                    <div style={itemMetaStyle}>
                      {item.tip} · {formatDate(item.datum)}
                    </div>
                  </div>

                  <span
                    style={{
                      ...pillStyle,
                      ...(Number(item.diff) < 0
                        ? latePillStyle
                        : Number(item.diff) <= 30
                        ? warningPillStyle
                        : okPillStyle),
                    }}
                  >
                    {Number(item.diff) < 0
                      ? `Kasni ${Math.abs(Number(item.diff))} dana`
                      : Number(item.diff) === 0
                      ? "Danas"
                      : `Za ${item.diff} dana`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Brze akcije</h2>

          <div style={quickGridStyle}>
            <Link href="/tvrtke" style={quickActionStyle}>
              <span style={quickIconStyle}>▦</span>
              <span>Tvrtke</span>
            </Link>

            <a href="/api/backup" style={quickActionStyle}>
              <span style={quickIconStyle}>⇩</span>
              <span>Backup baze</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  naslov,
  vrijednost,
  warning = false,
  danger = false,
}: {
  naslov: string;
  vrijednost: number;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      style={{
        ...statCardStyle,
        ...(warning && vrijednost > 0 ? warningStatStyle : {}),
        ...(danger && vrijednost > 0 ? dangerStatStyle : {}),
      }}
    >
      <div style={statLabelStyle}>{naslov}</div>
      <div style={statValueStyle}>{vrijednost}</div>
    </div>
  );
}

const heroCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 24,
  boxShadow: "0 2px 14px rgba(15, 23, 42, 0.08)",
  padding: 30,
  marginBottom: 24,
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "center",
  flexWrap: "wrap",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#e0f2fe",
  color: "#075985",
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 12,
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 36,
  fontWeight: 900,
  color: "#0f172a",
};

const heroTextStyle: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  fontSize: 15,
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  background: "#0f2747",
  color: "white",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "12px 16px",
  background: "#e2e8f0",
  color: "#0f172a",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 24,
};

const statCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: 22,
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.07)",
};

const warningStatStyle: React.CSSProperties = {
  background: "#fffbeb",
  border: "1px solid #fbbf24",
};

const dangerStatStyle: React.CSSProperties = {
  background: "#fee2e2",
  border: "1px solid #f87171",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#64748b",
  marginBottom: 10,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 900,
  color: "#0f172a",
};

const gridTwoStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 20,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: 24,
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.07)",
};

const sectionTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 900,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 14,
  marginTop: 6,
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const listItemStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  textDecoration: "none",
  color: "#0f172a",
  background: "#ffffff",
};

const itemTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  marginBottom: 4,
};

const itemMetaStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
};

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const latePillStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
};

const warningPillStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fbbf24",
};

const okPillStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #4ade80",
};

const quickGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const quickActionStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  alignItems: "center",
  gap: 12,
  textDecoration: "none",
  color: "#0f172a",
  fontWeight: 900,
};

const quickIconStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 12,
  background: "#e0f2fe",
  color: "#075985",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 14,
  background: "#f8fafc",
  color: "#64748b",
};

const errorStyle: React.CSSProperties = {
  marginBottom: 20,
  padding: 14,
  borderRadius: 14,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
  fontWeight: 800,
};