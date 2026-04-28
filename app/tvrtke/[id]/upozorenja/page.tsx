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

type Lijecnicki = {
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

type Upozorenje = {
  id: string;
  grupa: string;
  naslov: string;
  opis: string;
  datum: string;
  diff: number | null;
  status: "kasni" | "danas" | "uskoro" | "buduce" | "nepoznato";
  href: string;
};

export default function UpozorenjaTvrtkePage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [planer, setPlaner] = useState<PlanerItem[]>([]);
  const [lijecnicki, setLijecnicki] = useState<Lijecnicki[]>([]);
  const [osposobljavanja, setOsposobljavanja] = useState<Osposobljavanje[]>([]);
  const [ozo, setOzo] = useState<OzoOprema[]>([]);
  const [radnaOprema, setRadnaOprema] = useState<RadnaOprema[]>([]);

  const [filter, setFilter] = useState<"sve" | "kasni" | "7" | "30">("sve");
  const [loading, setLoading] = useState(true);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  const ucitajSve = async () => {
    try {
      setLoading(true);
      setGreska("");

      const [
        tvrtkeRes,
        radniciRes,
        planerRes,
        lijecnickiRes,
        osposobljavanjaRes,
        ozoRes,
        radnaOpremaRes,
      ] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/planer?firmaId=${encodeURIComponent(firmaId)}`, {
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
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtke.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!planerRes.ok) throw new Error("Ne mogu učitati planer.");
      if (!lijecnickiRes.ok) throw new Error("Ne mogu učitati liječničke.");
      if (!osposobljavanjaRes.ok) {
        throw new Error("Ne mogu učitati osposobljavanja.");
      }
      if (!ozoRes.ok) throw new Error("Ne mogu učitati OZO.");
      if (!radnaOpremaRes.ok) throw new Error("Ne mogu učitati radnu opremu.");

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const planerData: PlanerItem[] = await planerRes.json();
      const lijecnickiData: Lijecnicki[] = await lijecnickiRes.json();
      const osposobljavanjaData: Osposobljavanje[] =
        await osposobljavanjaRes.json();
      const ozoData: OzoOprema[] = await ozoRes.json();
      const radnaOpremaData: RadnaOprema[] = await radnaOpremaRes.json();

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;
      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronađena.");

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);
      setPlaner(planerData);
      setLijecnicki(lijecnickiData);
      setOsposobljavanja(osposobljavanjaData);
      setOzo(ozoData);
      setRadnaOprema(radnaOpremaData);
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

    const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
    if (dots) {
      const [, d, m, y] = dots;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return "";
  };

  const formatDate = (value: string | null) => {
    const iso = parseDate(value);
    if (!iso) return "-";

    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
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

  const statusIzDiffa = (
    diff: number | null
  ): Upozorenje["status"] => {
    if (diff === null) return "nepoznato";
    if (diff < 0) return "kasni";
    if (diff === 0) return "danas";
    if (diff <= 30) return "uskoro";
    return "buduce";
  };

  const tekstRoka = (diff: number | null) => {
    if (diff === null) return "Datum nije poznat";
    if (diff < 0) return `Kasni ${Math.abs(diff)} dana`;
    if (diff === 0) return "Danas";
    if (diff === 1) return "Za 1 dan";
    return `Za ${diff} dana`;
  };

  const nazivRadnikaPoOib = (oib: string) => {
    const radnik = radnici.find((r) => r.oib === oib);
    return radnik ? radnik.ime : oib || "-";
  };

  const nazivRadnikaPoId = (id: string | null) => {
    if (!id) return "-";
    const radnik = radnici.find((r) => r.id === id);
    return radnik ? radnik.ime : "-";
  };

  const nazivStrojaPoId = (id: string | null) => {
    if (!id) return "-";
    const stroj = radnaOprema.find((s) => s.id === id);
    if (!stroj) return "-";

    const broj = stroj.serijskiBroj || stroj.inventarniBroj;
    return broj ? `${stroj.naziv} (${broj})` : stroj.naziv;
  };

  const autoStatusPlaner = (item: PlanerItem) => {
    if (item.status === "izvrseno") return "izvrseno";

    const diff = daysUntil(item.datum);
    if (diff !== null && diff < 0) return "kasni";

    return "planirano";
  };

  const svaUpozorenja = useMemo<Upozorenje[]>(() => {
    const result: Upozorenje[] = [];

    planer.forEach((item) => {
      const status = autoStatusPlaner(item);
      if (status === "izvrseno") return;

      const diff = daysUntil(item.datum);

      result.push({
        id: `planer-${item.id}`,
        grupa: "Planer",
        naslov: item.naziv,
        opis:
          item.radnikId
            ? `Radnik: ${nazivRadnikaPoId(item.radnikId)}`
            : item.opremaId
            ? `Stroj/oprema: ${nazivStrojaPoId(item.opremaId)}`
            : item.opis || "Planirana obaveza",
        datum: item.datum,
        diff,
        status: statusIzDiffa(diff),
        href: `/tvrtke/${firmaId}/planer`,
      });
    });

    lijecnicki.forEach((item) => {
      const diff = daysUntil(item.vrijediDo);

      result.push({
        id: `lijecnicki-${item.id}`,
        grupa: "Liječnički",
        naslov: nazivRadnikaPoOib(item.oib),
        opis: item.vrsta || item.napomena || "Liječnički pregled",
        datum: item.vrijediDo,
        diff,
        status: statusIzDiffa(diff),
        href: `/tvrtke/${firmaId}/lijecnicki`,
      });
    });

    osposobljavanja.forEach((item) => {
      const diff = daysUntil(item.vrijediDo);

      result.push({
        id: `osposobljavanje-${item.id}`,
        grupa: "Osposobljavanje",
        naslov: nazivRadnikaPoOib(item.oib),
        opis: item.vrsta || item.napomena || "Osposobljavanje",
        datum: item.vrijediDo,
        diff,
        status: statusIzDiffa(diff),
        href: `/tvrtke/${firmaId}/osposobljavanja`,
      });
    });

    ozo.forEach((item) => {
      if (!item.rokZamjene) return;

      const diff = daysUntil(item.rokZamjene);

      result.push({
        id: `ozo-${item.id}`,
        grupa: "OZO",
        naslov: nazivRadnikaPoOib(item.oib),
        opis: `${item.vrsta} · količina: ${item.kolicina}`,
        datum: item.rokZamjene,
        diff,
        status: statusIzDiffa(diff),
        href: `/tvrtke/${firmaId}/oprema`,
      });
    });

    radnaOprema.forEach((item) => {
      if (!item.sljedeciServis) return;

      const diff = daysUntil(item.sljedeciServis);
      const broj = item.serijskiBroj || item.inventarniBroj;

      result.push({
        id: `stroj-${item.id}`,
        grupa: "Stroj / radna oprema",
        naslov: item.naziv,
        opis: broj ? `${item.tip} · ${broj}` : item.tip,
        datum: item.sljedeciServis,
        diff,
        status: statusIzDiffa(diff),
        href: `/tvrtke/${firmaId}/radna-oprema/${item.id}`,
      });
    });

    return result.sort((a, b) => {
      if (a.diff === null && b.diff === null) return 0;
      if (a.diff === null) return 1;
      if (b.diff === null) return -1;
      return a.diff - b.diff;
    });
  }, [planer, lijecnicki, osposobljavanja, ozo, radnaOprema, radnici, firmaId]);

  const filtriranaUpozorenja = useMemo(() => {
    if (filter === "kasni") {
      return svaUpozorenja.filter((u) => u.diff !== null && u.diff < 0);
    }

    if (filter === "7") {
      return svaUpozorenja.filter(
        (u) => u.diff !== null && u.diff >= 0 && u.diff <= 7
      );
    }

    if (filter === "30") {
      return svaUpozorenja.filter(
        (u) => u.diff !== null && u.diff >= 0 && u.diff <= 30
      );
    }

    return svaUpozorenja;
  }, [svaUpozorenja, filter]);

  const kasni = svaUpozorenja.filter((u) => u.diff !== null && u.diff < 0);
  const danas = svaUpozorenja.filter((u) => u.diff === 0);
  const uskoro7 = svaUpozorenja.filter(
    (u) => u.diff !== null && u.diff > 0 && u.diff <= 7
  );
  const uskoro30 = svaUpozorenja.filter(
    (u) => u.diff !== null && u.diff > 7 && u.diff <= 30
  );

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>Učitavanje upozorenja...</div>
        </div>
      </div>
    );
  }

  if (greska || !tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h1 style={titleStyle}>Greška</h1>
            <p>{greska || "Tvrtka nije pronađena."}</p>
            <Link href={`/tvrtke/${firmaId}`} style={primaryLinkStyle}>
              Natrag na tvrtku
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
          <Link href={`/tvrtke/${firmaId}`} style={backLinkStyle}>
            ← Natrag na tvrtku
          </Link>
        </div>

        <div style={heroCardStyle}>
          <div>
            <div style={badgeStyle}>Centralna upozorenja</div>
            <h1 style={heroTitleStyle}>{tvrtka.naziv}</h1>
            <div style={heroMetaStyle}>
              Jedan pregled svih rokova, kašnjenja i obaveza po modulima.
            </div>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatKartica naslov="Ukupno" vrijednost={svaUpozorenja.length} />
          <StatKartica naslov="Kasni" vrijednost={kasni.length} danger />
          <StatKartica naslov="Danas" vrijednost={danas.length} warning />
          <StatKartica naslov="U 7 dana" vrijednost={uskoro7.length} warning />
        </div>

        <div style={filterCardStyle}>
          <button
            type="button"
            onClick={() => setFilter("sve")}
            style={{
              ...filterButtonStyle,
              ...(filter === "sve" ? activeFilterButtonStyle : {}),
            }}
          >
            Sve
          </button>

          <button
            type="button"
            onClick={() => setFilter("kasni")}
            style={{
              ...filterButtonStyle,
              ...(filter === "kasni" ? activeFilterButtonStyle : {}),
            }}
          >
            Kasni
          </button>

          <button
            type="button"
            onClick={() => setFilter("7")}
            style={{
              ...filterButtonStyle,
              ...(filter === "7" ? activeFilterButtonStyle : {}),
            }}
          >
            U 7 dana
          </button>

          <button
            type="button"
            onClick={() => setFilter("30")}
            style={{
              ...filterButtonStyle,
              ...(filter === "30" ? activeFilterButtonStyle : {}),
            }}
          >
            U 30 dana
          </button>
        </div>

        <Sekcija
          naslov="Crveno — kasni"
          opis="Sve stavke kojima je rok već prošao."
          items={kasni}
          empty="Nema zakašnjelih stavki."
          formatDate={formatDate}
          tekstRoka={tekstRoka}
        />

        <Sekcija
          naslov="Danas"
          opis="Stavke koje imaju rok danas."
          items={danas}
          empty="Nema stavki za danas."
          formatDate={formatDate}
          tekstRoka={tekstRoka}
        />

        <Sekcija
          naslov="Uskoro — sljedećih 7 dana"
          opis="Stavke koje dolaze vrlo brzo."
          items={uskoro7}
          empty="Nema stavki u sljedećih 7 dana."
          formatDate={formatDate}
          tekstRoka={tekstRoka}
        />

        <Sekcija
          naslov="Kasnije — 8 do 30 dana"
          opis="Nadolazeće obaveze u sljedećih mjesec dana."
          items={uskoro30}
          empty="Nema stavki u periodu 8 do 30 dana."
          formatDate={formatDate}
          tekstRoka={tekstRoka}
        />

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            Filtrirani pregled ({filtriranaUpozorenja.length})
          </h2>

          {filtriranaUpozorenja.length === 0 ? (
            <div style={emptyStyle}>Nema stavki za odabrani filter.</div>
          ) : (
            <div style={listStyle}>
              {filtriranaUpozorenja.map((item) => (
                <UpozorenjeKartica
                  key={item.id}
                  item={item}
                  formatDate={formatDate}
                  tekstRoka={tekstRoka}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatKartica({
  naslov,
  vrijednost,
  danger = false,
  warning = false,
}: {
  naslov: string;
  vrijednost: number;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        ...statCardStyle,
        ...(danger && vrijednost > 0
          ? { background: "#fee2e2", border: "1px solid #f87171" }
          : {}),
        ...(warning && vrijednost > 0
          ? { background: "#fffbeb", border: "1px solid #fbbf24" }
          : {}),
      }}
    >
      <div style={statLabelStyle}>{naslov}</div>
      <div style={statValueStyle}>{vrijednost}</div>
    </div>
  );
}

function Sekcija({
  naslov,
  opis,
  items,
  empty,
  formatDate,
  tekstRoka,
}: {
  naslov: string;
  opis: string;
  items: Upozorenje[];
  empty: string;
  formatDate: (value: string | null) => string;
  tekstRoka: (diff: number | null) => string;
}) {
  return (
    <div style={cardStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>{naslov}</h2>
          <div style={sectionDescriptionStyle}>{opis}</div>
        </div>

        <div style={countPillStyle}>{items.length}</div>
      </div>

      {items.length === 0 ? (
        <div style={emptyStyle}>{empty}</div>
      ) : (
        <div style={listStyle}>
          {items.map((item) => (
            <UpozorenjeKartica
              key={item.id}
              item={item}
              formatDate={formatDate}
              tekstRoka={tekstRoka}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UpozorenjeKartica({
  item,
  formatDate,
  tekstRoka,
}: {
  item: Upozorenje;
  formatDate: (value: string | null) => string;
  tekstRoka: (diff: number | null) => string;
}) {
  return (
    <div style={warningItemStyle}>
      <div style={warningLeftStyle}>
        <div style={topLineStyle}>
          <span style={groupPillStyle}>{item.grupa}</span>
          <span
            style={{
              ...statusPillStyle,
              ...statusStyle(item.status),
            }}
          >
            {tekstRoka(item.diff)}
          </span>
        </div>

        <div style={warningTitleStyle}>{item.naslov}</div>
        <div style={warningDescriptionStyle}>{item.opis}</div>
        <div style={dateStyle}>Rok: {formatDate(item.datum)}</div>
      </div>

      <Link href={item.href} style={openLinkStyle}>
        Otvori
      </Link>
    </div>
  );
}

function statusStyle(status: Upozorenje["status"]): React.CSSProperties {
  if (status === "kasni") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #f87171",
    };
  }

  if (status === "danas") {
    return {
      background: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fbbf24",
    };
  }

  if (status === "uskoro") {
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fbbf24",
    };
  }

  return {
    background: "#e5e7eb",
    color: "#111827",
    border: "1px solid #d1d5db",
  };
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

const heroCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 22,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  padding: 28,
  marginBottom: 24,
};

const badgeStyle: React.CSSProperties = {
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
  color: "#374151",
  fontSize: 15,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 20,
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
};

const filterCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 16,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginBottom: 20,
};

const filterButtonStyle: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const activeFilterButtonStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 22,
  marginBottom: 20,
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  fontSize: 28,
  fontWeight: 800,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  color: "#111827",
};

const sectionDescriptionStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 14,
  marginTop: 6,
};

const countPillStyle: React.CSSProperties = {
  minWidth: 44,
  height: 44,
  borderRadius: 999,
  background: "#111827",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const warningItemStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  background: "#ffffff",
};

const warningLeftStyle: React.CSSProperties = {
  minWidth: 0,
};

const topLineStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 10,
};

const groupPillStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  background: "#eff6ff",
  color: "#1d4ed8",
  border: "1px solid #93c5fd",
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
};

const warningTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 4,
};

const warningDescriptionStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#374151",
  marginBottom: 6,
};

const dateStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  fontWeight: 700,
};

const openLinkStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
  borderRadius: 10,
  padding: "10px 14px",
  textDecoration: "none",
  fontWeight: 800,
  whiteSpace: "nowrap",
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f9fafb",
  color: "#6b7280",
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