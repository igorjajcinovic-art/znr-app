"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Radnik = {
  id: string;
  firmaId: string;
  ime: string;
  oib: string;
  aktivan: boolean;
  datumZaposlenja: string | null;
  datumOdjave: string | null;
  radnoMjesto: string | null;
  grad: string | null;
};

type Tvrtka = {
  id: string;
  naziv: string;
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

export default function PovijestRadnikaDetaljiPage() {
  const params = useParams();
  const oibRaw = Array.isArray(params.oib) ? params.oib[0] : params.oib;
  const oib = String(oibRaw ?? "");

  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [tvrtke, setTvrtke] = useState<Tvrtka[]>([]);
  const [lijecnicki, setLijecnicki] = useState<Lijecnicki[]>([]);
  const [osposobljavanja, setOsposobljavanja] = useState<Osposobljavanje[]>(
    []
  );
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    if (!oib) return;
    ucitajSve();
  }, [oib]);

  const ucitajSve = async () => {
    try {
      setGreska("");
      setUcitavanje(true);

      const [radniciRes, tvrtkeRes, lijecnickiRes, osposRes] =
        await Promise.all([
          fetch("/api/radnici", { cache: "no-store" }),
          fetch("/api/tvrtke", { cache: "no-store" }),
          fetch("/api/lijecnicki", { cache: "no-store" }),
          fetch("/api/osposobljavanja", { cache: "no-store" }),
        ]);

      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtke.");
      if (!lijecnickiRes.ok) throw new Error("Ne mogu učitati liječničke.");
      if (!osposRes.ok) throw new Error("Ne mogu učitati osposobljavanja.");

      const radniciData: Radnik[] = await radniciRes.json();
      const tvrtkeData: Tvrtka[] = await tvrtkeRes.json();
      const lijecnickiData: Lijecnicki[] = await lijecnickiRes.json();
      const osposData: Osposobljavanje[] = await osposRes.json();

      setRadnici(radniciData.filter((r) => r.oib === oib));
      setTvrtke(tvrtkeData);
      setLijecnicki(lijecnickiData.filter((l) => l.oib === oib));
      setOsposobljavanja(osposData.filter((o) => o.oib === oib));
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const getTvrtka = (firmaId: string) =>
    tvrtke.find((t) => t.id === firmaId)?.naziv || "-";

  const formatDate = (value: string | null) => {
    if (!value) return "-";

    if (value.includes("T")) {
      const d = new Date(value);
      return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
        d.getUTCMonth() + 1
      ).padStart(2, "0")}.${d.getUTCFullYear()}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}.${m}.${y}`;
    }

    return value;
  };

  const parseDate = (value: string | null) => {
    if (!value) return "";
    if (value.includes("T")) return value.split("T")[0];
    return value;
  };

  const daysUntil = (value: string | null) => {
    const iso = parseDate(value);
    if (!iso) return null;

    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return null;

    const target = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(target.getTime())) return null;

    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.ceil((targetOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
  };

  const statusRoka = (value: string | null) => {
    const diff = daysUntil(value);

    if (diff === null) return { text: "-", level: "none" as const };
    if (diff < 0) return { text: `Isteklo prije ${Math.abs(diff)} dana`, level: "expired" as const };
    if (diff <= 30) return { text: `Istječe za ${diff} dana`, level: "warning" as const };
    return { text: `Važi još ${diff} dana`, level: "ok" as const };
  };

  const statusStyle = (value: string | null): React.CSSProperties => {
    const s = statusRoka(value);

    if (s.level === "expired") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #f87171",
      };
    }

    if (s.level === "warning") {
      return {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fbbf24",
      };
    }

    if (s.level === "ok") {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #4ade80",
      };
    }

    return {
      background: "#f3f4f6",
      color: "#374151",
      border: "1px solid #d1d5db",
    };
  };

  const aktivanZapis = useMemo(
    () => radnici.find((r) => r.aktivan) || radnici[0],
    [radnici]
  );

  if (ucitavanje) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (greska) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>{greska}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/radnici/povijest" style={backLinkStyle}>
            ← Natrag na povijest radnika
          </Link>
        </div>

        <div style={heroCardStyle}>
          <div style={heroBadgeStyle}>Detalji po OIB-u</div>
          <h1 style={heroTitleStyle}>
            {aktivanZapis?.ime || "Radnik"} — {oib}
          </h1>
          <p style={heroTextStyle}>
            Ovdje vidiš sve zapise zaposlenja, sva liječnička i sva
            osposobljavanja za isti OIB.
          </p>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Zapisi radnika</h2>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Ime</th>
                  <th style={thStyle}>Tvrtka</th>
                  <th style={thStyle}>Radno mjesto</th>
                  <th style={thStyle}>Početak rada</th>
                  <th style={thStyle}>Odjava</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {radnici.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={tdCenterStyle}>
                      Nema zapisa.
                    </td>
                  </tr>
                ) : (
                  radnici
                    .slice()
                    .sort((a, b) =>
                      (b.datumZaposlenja || "").localeCompare(a.datumZaposlenja || "")
                    )
                    .map((r) => (
                      <tr key={r.id}>
                        <td style={tdStyle}>{r.ime}</td>
                        <td style={tdStyle}>{getTvrtka(r.firmaId)}</td>
                        <td style={tdStyle}>{r.radnoMjesto || "-"}</td>
                        <td style={tdStyle}>{formatDate(r.datumZaposlenja)}</td>
                        <td style={tdStyle}>{formatDate(r.datumOdjave)}</td>
                        <td style={tdStyle}>
                          {r.aktivan ? (
                            <span style={activeStyle}>AKTIVAN</span>
                          ) : (
                            <span style={inactiveStyle}>NEAKTIVAN</span>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Liječnički pregledi</h2>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Tvrtka</th>
                  <th style={thStyle}>Vrsta</th>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Vrijedi do</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Napomena</th>
                </tr>
              </thead>
              <tbody>
                {lijecnicki.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={tdCenterStyle}>
                      Nema liječničkih pregleda.
                    </td>
                  </tr>
                ) : (
                  lijecnicki
                    .slice()
                    .sort((a, b) => (a.vrijediDo || "").localeCompare(b.vrijediDo || ""))
                    .map((l) => (
                      <tr key={l.id}>
                        <td style={tdStyle}>{getTvrtka(l.firmaId)}</td>
                        <td style={tdStyle}>{l.vrsta || "-"}</td>
                        <td style={tdStyle}>{formatDate(l.datum)}</td>
                        <td style={tdStyle}>{formatDate(l.vrijediDo)}</td>
                        <td style={tdStyle}>
                          <span style={{ ...pillStyle, ...statusStyle(l.vrijediDo) }}>
                            {statusRoka(l.vrijediDo).text}
                          </span>
                        </td>
                        <td style={tdStyle}>{l.napomena || "-"}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Stručna osposobljavanja</h2>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Tvrtka</th>
                  <th style={thStyle}>Vrsta</th>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Vrijedi do</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Napomena</th>
                </tr>
              </thead>
              <tbody>
                {osposobljavanja.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={tdCenterStyle}>
                      Nema osposobljavanja.
                    </td>
                  </tr>
                ) : (
                  osposobljavanja
                    .slice()
                    .sort((a, b) => (a.vrijediDo || "").localeCompare(b.vrijediDo || ""))
                    .map((o) => (
                      <tr key={o.id}>
                        <td style={tdStyle}>{getTvrtka(o.firmaId)}</td>
                        <td style={tdStyle}>{o.vrsta}</td>
                        <td style={tdStyle}>{formatDate(o.datum)}</td>
                        <td style={tdStyle}>{formatDate(o.vrijediDo)}</td>
                        <td style={tdStyle}>
                          <span style={{ ...pillStyle, ...statusStyle(o.vrijediDo) }}>
                            {statusRoka(o.vrijediDo).text}
                          </span>
                        </td>
                        <td style={tdStyle}>{o.napomena || "-"}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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

const heroCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  padding: 24,
  marginBottom: 24,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 24,
  marginBottom: 24,
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
  fontSize: 34,
  fontWeight: 800,
  margin: 0,
  marginBottom: 8,
  color: "#111827",
};

const heroTextStyle: React.CSSProperties = {
  color: "#4b5563",
  lineHeight: 1.6,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  marginBottom: 16,
};

const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 950,
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #e5e7eb",
  padding: 12,
  textAlign: "left",
  color: "#374151",
  fontWeight: 800,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  padding: 12,
  verticalAlign: "top",
};

const tdCenterStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  padding: 20,
  textAlign: "center",
  color: "#6b7280",
};

const activeStyle: React.CSSProperties = {
  color: "#166534",
  fontWeight: 800,
};

const inactiveStyle: React.CSSProperties = {
  color: "#991b1b",
  fontWeight: 800,
};

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};