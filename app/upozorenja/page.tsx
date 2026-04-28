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

type UpozorenjeItem = {
  id: string;
  tip: string;
  radnikIme: string;
  radnikId?: string;
  oib: string;
  tvrtkaNaziv: string;
  tvrtkaId: string;
  datum: string;
  statusText: string;
  level: "expired" | "warning";
  days: number;
  napomena?: string | null;
  akcijaHref: string;
  akcijaLabel: string;
};

export default function UpozorenjaPage() {
  const [tvrtke, setTvrtke] = useState<Tvrtka[]>([]);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [lijecnicki, setLijecnicki] = useState<Lijecnicki[]>([]);
  const [osposobljavanja, setOsposobljavanja] = useState<Osposobljavanje[]>([]);
  const [radnaOprema, setRadnaOprema] = useState<RadnaOprema[]>([]);
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
        radnaOpremaRes,
      ] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch("/api/radnici", { cache: "no-store" }),
        fetch("/api/lijecnicki", { cache: "no-store" }),
        fetch("/api/osposobljavanja", { cache: "no-store" }),
        fetch("/api/radna-oprema", { cache: "no-store" }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtke.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!lijecnickiRes.ok) throw new Error("Ne mogu učitati liječničke.");
      if (!osposobljavanjaRes.ok) {
        throw new Error("Ne mogu učitati osposobljavanja.");
      }
      if (!radnaOpremaRes.ok) {
        throw new Error("Ne mogu učitati radnu opremu i strojeve.");
      }

      const tvrtkeData: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const lijecnickiData: Lijecnicki[] = await lijecnickiRes.json();
      const osposobljavanjaData: Osposobljavanje[] =
        await osposobljavanjaRes.json();
      const radnaOpremaData: RadnaOprema[] = await radnaOpremaRes.json();

      setTvrtke(tvrtkeData);
      setRadnici(radniciData);
      setLijecnicki(lijecnickiData);
      setOsposobljavanja(osposobljavanjaData);
      setRadnaOprema(radnaOpremaData);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (value: string | null): string => {
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

  const formatDate = (value: string | null): string => {
    const iso = parseDate(value);
    if (!iso) return "-";

    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "-";

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

  const getStatus = (value: string | null) => {
    const diff = daysUntil(value);

    if (diff === null) return null;
    if (diff < 0) {
      return {
        text: `Isteklo prije ${Math.abs(diff)} dana`,
        level: "expired" as const,
        days: diff,
      };
    }
    if (diff <= 30) {
      return {
        text: `Istječe za ${diff} dana`,
        level: "warning" as const,
        days: diff,
      };
    }

    return null;
  };

  const nadjiRadnika = (oib: string, firmaId: string) => {
    const aktivan = radnici.find(
      (r) => r.oib === oib && r.firmaId === firmaId && r.aktivan
    );
    if (aktivan) return aktivan;

    return radnici.find((r) => r.oib === oib && r.firmaId === firmaId) || null;
  };

  const upozorenjaDozvole = useMemo<UpozorenjeItem[]>(() => {
    return radnici
      .filter((r) => r.imaDozvolu && r.dozvolaDo)
      .map((r) => {
        const s = getStatus(r.dozvolaDo);
        if (!s) return null;

        const tvrtka = tvrtke.find((t) => t.id === r.firmaId);

        return {
          id: r.id,
          tip: "Radna dozvola",
          radnikIme: r.ime,
          radnikId: r.id,
          oib: r.oib,
          tvrtkaNaziv: tvrtka?.naziv || "-",
          tvrtkaId: r.firmaId,
          datum: formatDate(r.dozvolaDo),
          statusText: s.text,
          level: s.level,
          days: s.days,
          napomena: null,
          akcijaHref: `/tvrtke/${r.firmaId}/radnici`,
          akcijaLabel: "Otvori radnike",
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.level !== b!.level) return a!.level === "expired" ? -1 : 1;
        return a!.days - b!.days;
      }) as UpozorenjeItem[];
  }, [radnici, tvrtke]);

  const upozorenjaLijecnicki = useMemo<UpozorenjeItem[]>(() => {
    return lijecnicki
      .map((l) => {
        const s = getStatus(l.vrijediDo);
        if (!s) return null;

        const tvrtka = tvrtke.find((t) => t.id === l.firmaId);
        const radnik = nadjiRadnika(l.oib, l.firmaId);

        return {
          id: l.id,
          tip: l.vrsta || "Liječnički pregled",
          radnikIme: radnik?.ime || l.oib,
          radnikId: radnik?.id,
          oib: l.oib,
          tvrtkaNaziv: tvrtka?.naziv || "-",
          tvrtkaId: l.firmaId,
          datum: formatDate(l.vrijediDo),
          statusText: s.text,
          level: s.level,
          days: s.days,
          napomena: l.napomena,
          akcijaHref: `/tvrtke/${l.firmaId}/lijecnicki`,
          akcijaLabel: "Otvori liječničke",
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.level !== b!.level) return a!.level === "expired" ? -1 : 1;
        return a!.days - b!.days;
      }) as UpozorenjeItem[];
  }, [lijecnicki, radnici, tvrtke]);

  const upozorenjaOsposobljavanja = useMemo<UpozorenjeItem[]>(() => {
    return osposobljavanja
      .map((o) => {
        const s = getStatus(o.vrijediDo);
        if (!s) return null;

        const tvrtka = tvrtke.find((t) => t.id === o.firmaId);
        const radnik = nadjiRadnika(o.oib, o.firmaId);

        return {
          id: o.id,
          tip: o.vrsta,
          radnikIme: radnik?.ime || o.oib,
          radnikId: radnik?.id,
          oib: o.oib,
          tvrtkaNaziv: tvrtka?.naziv || "-",
          tvrtkaId: o.firmaId,
          datum: formatDate(o.vrijediDo),
          statusText: s.text,
          level: s.level,
          days: s.days,
          napomena: o.napomena,
          akcijaHref: `/tvrtke/${o.firmaId}/osposobljavanja`,
          akcijaLabel: "Otvori osposobljavanja",
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.level !== b!.level) return a!.level === "expired" ? -1 : 1;
        return a!.days - b!.days;
      }) as UpozorenjeItem[];
  }, [osposobljavanja, radnici, tvrtke]);

  const upozorenjaRadnaOprema = useMemo<UpozorenjeItem[]>(() => {
    return radnaOprema
      .map((o) => {
        const s = getStatus(o.sljedeciServis);
        if (!s) return null;

        const tvrtka = tvrtke.find((t) => t.id === o.firmaId);

        const nazivStroja = [o.naziv, o.tip].filter(Boolean).join(" / ");

        return {
          id: o.id,
          tip: "Servis stroja / radne opreme",
          radnikIme: nazivStroja || "Stroj",
          oib: o.serijskiBroj || o.inventarniBroj || "-",
          tvrtkaNaziv: tvrtka?.naziv || "-",
          tvrtkaId: o.firmaId,
          datum: formatDate(o.sljedeciServis),
          statusText: s.text,
          level: s.level,
          days: s.days,
          napomena: o.napomena,
          akcijaHref: `/tvrtke/${o.firmaId}/radna-oprema`,
          akcijaLabel: "Otvori strojeve",
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a!.level !== b!.level) return a!.level === "expired" ? -1 : 1;
        return a!.days - b!.days;
      }) as UpozorenjeItem[];
  }, [radnaOprema, tvrtke]);

  const ukupno =
    upozorenjaDozvole.length +
    upozorenjaLijecnicki.length +
    upozorenjaOsposobljavanja.length +
    upozorenjaRadnaOprema.length;

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={boxStyle}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (greska) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={boxStyle}>
            <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
              Greška
            </h1>
            <div>{greska}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 16 }}>
          <Link
            href="/tvrtke"
            style={{
              color: "#111827",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            ← Natrag na tvrtke
          </Link>
        </div>

        <div style={boxStyle}>
          <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 8 }}>
            Sva upozorenja
          </h1>
          <div style={{ color: "#4b5563" }}>
            Ukupno upozorenja: <strong>{ukupno}</strong>
          </div>
        </div>

        <SekcijaUpozorenja
          naslov="Liječnički pregledi"
          stavke={upozorenjaLijecnicki}
        />

        <SekcijaUpozorenja
          naslov="Radne dozvole"
          stavke={upozorenjaDozvole}
        />

        <SekcijaUpozorenja
          naslov="Stručna osposobljavanja"
          stavke={upozorenjaOsposobljavanja}
        />

        <SekcijaUpozorenja
          naslov="Radna oprema i strojevi"
          stavke={upozorenjaRadnaOprema}
        />
      </div>
    </div>
  );
}

function SekcijaUpozorenja({
  naslov,
  stavke,
}: {
  naslov: string;
  stavke: UpozorenjeItem[];
}) {
  return (
    <div style={boxStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{naslov}</h2>
        <div style={{ color: "#6b7280" }}>Ukupno: {stavke.length}</div>
      </div>

      {stavke.length === 0 ? (
        <div style={{ color: "#166534" }}>Nema upozorenja.</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={thStyle}>Tip</th>
              <th style={thStyle}>Osoba / stroj</th>
              <th style={thStyle}>OIB / broj</th>
              <th style={thStyle}>Tvrtka</th>
              <th style={thStyle}>Vrijedi do</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Napomena</th>
              <th style={thStyle}>Akcija</th>
            </tr>
          </thead>
          <tbody>
            {stavke.map((u) => (
              <tr key={`${u.tip}-${u.id}`}>
                <td style={tdStyle}>{u.tip}</td>
                <td style={tdStyle}>{u.radnikIme}</td>
                <td style={tdStyle}>{u.oib}</td>
                <td style={tdStyle}>{u.tvrtkaNaziv}</td>
                <td style={tdStyle}>{u.datum}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      ...(u.level === "expired"
                        ? {
                            background: "#fee2e2",
                            color: "#991b1b",
                            border: "1px solid #f87171",
                          }
                        : {
                            background: "#fef3c7",
                            color: "#92400e",
                            border: "1px solid #fbbf24",
                          }),
                    }}
                  >
                    {u.statusText}
                  </span>
                </td>
                <td style={tdStyle}>{u.napomena || "-"}</td>
                <td style={tdStyle}>
                  <Link href={u.akcijaHref} style={actionLinkStyle}>
                    {u.akcijaLabel}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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

const boxStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  padding: 24,
  marginBottom: 24,
};

const thStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 10,
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 10,
  verticalAlign: "top",
};

const actionLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  background: "#111827",
  color: "white",
  borderRadius: 8,
  textDecoration: "none",
};