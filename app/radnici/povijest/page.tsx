"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Radnik = {
  id: string;
  firmaId: string;
  ime: string;
  oib: string;
  aktivan: boolean;
  datumZaposlenja: string | null;
  datumOdjave: string | null;
  radnoMjesto: string | null;
};

type Tvrtka = {
  id: string;
  naziv: string;
};

export default function PovijestRadnikaPage() {
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [tvrtke, setTvrtke] = useState<Tvrtka[]>([]);
  const [oib, setOib] = useState("");
  const [rezultati, setRezultati] = useState<Radnik[]>([]);
  const [ucitavanje, setUcitavanje] = useState(false);

  useEffect(() => {
    ucitajSve();
  }, []);

  const ucitajSve = async () => {
    try {
      setUcitavanje(true);

      const [radniciRes, tvrtkeRes] = await Promise.all([
        fetch("/api/radnici", { cache: "no-store" }),
        fetch("/api/tvrtke", { cache: "no-store" }),
      ]);

      const radniciData = await radniciRes.json();
      const tvrtkeData = await tvrtkeRes.json();

      setRadnici(radniciData);
      setTvrtke(tvrtkeData);
    } catch {
      alert("Greška kod učitavanja.");
    } finally {
      setUcitavanje(false);
    }
  };

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

  const pretrazi = () => {
    const trazeni = oib.trim();

    if (!trazeni) {
      alert("Unesi OIB");
      return;
    }

    const filtrirani = radnici
      .filter((r) => r.oib.includes(trazeni))
      .sort((a, b) => {
        const da = a.datumZaposlenja || "";
        const db = b.datumZaposlenja || "";
        return db.localeCompare(da);
      });

    setRezultati(filtrirani);
  };

  const getTvrtka = (firmaId: string) => {
    return tvrtke.find((t) => t.id === firmaId)?.naziv || "-";
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/tvrtke" style={backLinkStyle}>
            ← Natrag na tvrtke
          </Link>
        </div>

        <div style={heroCardStyle}>
          <div style={heroBadgeStyle}>Povijest radnika</div>
          <h1 style={heroTitleStyle}>Pretraga po OIB-u</h1>
          <p style={heroTextStyle}>
            Ovdje vidiš sve zapise istog radnika kroz vrijeme i kroz različite
            firme.
          </p>

          <div style={searchRowStyle}>
            <input
              style={inputStyle}
              placeholder="Unesi OIB"
              value={oib}
              onChange={(e) => setOib(e.target.value)}
            />

            <button style={buttonStyle} onClick={pretrazi}>
              Pretraži
            </button>
          </div>
        </div>

        {ucitavanje && <div style={cardStyle}>Učitavanje...</div>}

        {rezultati.length > 0 && (
          <div style={cardStyle}>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>Rezultati</h2>
              <div style={sectionSubtitleStyle}>Ukupno zapisa: {rezultati.length}</div>
            </div>

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={thStyle}>Ime</th>
                    <th style={thStyle}>OIB</th>
                    <th style={thStyle}>Tvrtka</th>
                    <th style={thStyle}>Početak rada</th>
                    <th style={thStyle}>Odjava</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Akcija</th>
                  </tr>
                </thead>
                <tbody>
                  {rezultati.map((r) => (
                    <tr key={r.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: "#111827" }}>
                          {r.ime}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: 12 }}>
                          {r.radnoMjesto || "-"}
                        </div>
                      </td>
                      <td style={tdStyle}>{r.oib}</td>
                      <td style={tdStyle}>{getTvrtka(r.firmaId)}</td>
                      <td style={tdStyle}>{formatDate(r.datumZaposlenja)}</td>
                      <td style={tdStyle}>{formatDate(r.datumOdjave)}</td>
                      <td style={tdStyle}>
                        {r.aktivan ? (
                          <span style={activeStyle}>AKTIVAN</span>
                        ) : (
                          <span style={inactiveStyle}>NEAKTIVAN</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Link
                          href={`/radnici/povijest/${encodeURIComponent(r.oib)}`}
                          style={darkLinkStyle}
                        >
                          Otvori detalje
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {rezultati.length === 0 && oib.trim() && !ucitavanje && (
          <div style={cardStyle}>Nema rezultata.</div>
        )}
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
  maxWidth: 1200,
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
  marginBottom: 18,
};

const searchRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 260,
  padding: "11px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
};

const buttonStyle: React.CSSProperties = {
  padding: "11px 16px",
  background: "#111827",
  color: "white",
  borderRadius: 10,
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
};

const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  marginBottom: 4,
};

const sectionSubtitleStyle: React.CSSProperties = {
  color: "#6b7280",
};

const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 900,
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

const activeStyle: React.CSSProperties = {
  color: "#166534",
  fontWeight: 800,
};

const inactiveStyle: React.CSSProperties = {
  color: "#991b1b",
  fontWeight: 800,
};

const darkLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  background: "#111827",
  color: "white",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 700,
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};