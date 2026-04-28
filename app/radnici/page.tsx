"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
};

export default function SviRadniciPage() {
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [tvrtke, setTvrtke] = useState<Tvrtka[]>([]);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [greska, setGreska] = useState("");

  const [filterIme, setFilterIme] = useState("");
  const [filterOib, setFilterOib] = useState("");
  const [filterTvrtka, setFilterTvrtka] = useState("sve");
  const [filterStatus, setFilterStatus] = useState("svi");

  useEffect(() => {
    ucitajSve();
  }, []);

  const ucitajSve = async () => {
    try {
      setUcitavanje(true);
      setGreska("");

      const [radniciRes, tvrtkeRes] = await Promise.all([
        fetch("/api/radnici", { cache: "no-store" }),
        fetch("/api/tvrtke", { cache: "no-store" }),
      ]);

      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtke.");

      const radniciData: Radnik[] = await radniciRes.json();
      const tvrtkeData: Tvrtka[] = await tvrtkeRes.json();

      setRadnici(radniciData);
      setTvrtke(tvrtkeData);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";

    if (value.includes("T")) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
          d.getUTCMonth() + 1
        ).padStart(2, "0")}.${d.getUTCFullYear()}`;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}.${m}.${y}`;
    }

    return value;
  };

  const getNazivTvrtke = (firmaId: string) =>
    tvrtke.find((t) => t.id === firmaId)?.naziv || "-";

  const filtriraniRadnici = useMemo(() => {
    return radnici
      .filter((r) => {
        const okIme =
          !filterIme ||
          r.ime.toLowerCase().includes(filterIme.toLowerCase());

        const okOib = !filterOib || r.oib.includes(filterOib);

        const okTvrtka =
          filterTvrtka === "sve" || r.firmaId === filterTvrtka;

        const okStatus =
          filterStatus === "svi" ||
          (filterStatus === "aktivni" && r.aktivan) ||
          (filterStatus === "neaktivni" && !r.aktivan);

        return okIme && okOib && okTvrtka && okStatus;
      })
      .sort((a, b) => a.ime.localeCompare(b.ime, "hr"));
  }, [radnici, filterIme, filterOib, filterTvrtka, filterStatus]);

  const brojAktivnih = useMemo(
    () => radnici.filter((r) => r.aktivan).length,
    [radnici]
  );

  const brojNeaktivnih = useMemo(
    () => radnici.filter((r) => !r.aktivan).length,
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
          <div style={cardStyle}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
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
          <Link href="/tvrtke" style={backLinkStyle}>
            ← Natrag na tvrtke
          </Link>
        </div>

        <div style={heroCardStyle}>
          <div style={heroTopStyle}>
            <div>
              <div style={heroBadgeStyle}>Globalni pregled</div>
              <h1 style={heroTitleStyle}>Svi radnici</h1>
              <div style={heroTextStyle}>
                Pregled svih radnika iz svih tvrtki s brzim filterima i linkom
                na povijest po OIB-u.
              </div>
            </div>

            <div style={heroInfoCardStyle}>
              <div style={heroInfoLabelStyle}>Ukupno radnika</div>
              <div style={heroInfoValueStyle}>{radnici.length}</div>
            </div>
          </div>

          <div style={statsMiniGridStyle}>
            <MiniStat label="Aktivni" value={brojAktivnih} />
            <MiniStat label="Neaktivni" value={brojNeaktivnih} />
            <MiniStat label="Tvrtke" value={tvrtke.length} />
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Filteri i pretraga</h2>

          <div style={filterGridStyle}>
            <div>
              <label style={labelStyle}>Ime i prezime</label>
              <input
                style={inputStyle}
                value={filterIme}
                onChange={(e) => setFilterIme(e.target.value)}
                placeholder="Pretraga po imenu"
              />
            </div>

            <div>
              <label style={labelStyle}>OIB</label>
              <input
                style={inputStyle}
                value={filterOib}
                onChange={(e) => setFilterOib(e.target.value)}
                placeholder="Pretraga po OIB-u"
              />
            </div>

            <div>
              <label style={labelStyle}>Tvrtka</label>
              <select
                style={inputStyle}
                value={filterTvrtka}
                onChange={(e) => setFilterTvrtka(e.target.value)}
              >
                <option value="sve">Sve tvrtke</option>
                {tvrtke.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.naziv}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="svi">Svi</option>
                <option value="aktivni">Samo aktivni</option>
                <option value="neaktivni">Samo neaktivni</option>
              </select>
            </div>
          </div>

          <div style={actionRowStyle}>
            <button
              style={grayButtonStyle}
              onClick={() => {
                setFilterIme("");
                setFilterOib("");
                setFilterTvrtka("sve");
                setFilterStatus("svi");
              }}
            >
              Očisti filtere
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={tableHeaderStyle}>
            <div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: 4 }}>
                Popis radnika
              </h2>
              <div style={sectionSubtitleStyle}>
                Prikazano: {filtriraniRadnici.length}
              </div>
            </div>

            <Link href="/radnici/povijest" style={darkLinkStyle}>
              Povijest po OIB-u
            </Link>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Ime i prezime</th>
                  <th style={thStyle}>OIB</th>
                  <th style={thStyle}>Tvrtka</th>
                  <th style={thStyle}>Radno mjesto</th>
                  <th style={thStyle}>Početak rada</th>
                  <th style={thStyle}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filtriraniRadnici.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={tdCenterStyle}>
                      Nema radnika za prikaz.
                    </td>
                  </tr>
                ) : (
                  filtriraniRadnici.map((r) => (
                    <tr key={r.id}>
                      <td style={tdStyle}>
                        <span
                          style={{
                            ...pillStyle,
                            ...(r.aktivan ? activePillStyle : inactivePillStyle),
                          }}
                        >
                          {r.aktivan ? "Aktivan" : "Neaktivan"}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: "#111827" }}>
                          {r.ime}
                        </div>
                      </td>
                      <td style={tdStyle}>{r.oib}</td>
                      <td style={tdStyle}>{getNazivTvrtke(r.firmaId)}</td>
                      <td style={tdStyle}>{r.radnoMjesto || "-"}</td>
                      <td style={tdStyle}>{formatDate(r.datumZaposlenja)}</td>
                      <td style={tdStyle}>
                        <div style={tableActionsStyle}>
                          <Link
                            href={`/tvrtke/${r.firmaId}/radnici`}
                            style={smallDarkLinkStyle}
                          >
                            Otvori tvrtku
                          </Link>
                          <Link
                            href={`/radnici/povijest/${encodeURIComponent(r.oib)}`}
                            style={smallGrayLinkStyle}
                          >
                            Povijest
                          </Link>
                        </div>
                      </td>
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div style={miniStatStyle}>
      <div style={miniStatLabelStyle}>{label}</div>
      <div style={miniStatValueStyle}>{value}</div>
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
  borderRadius: 22,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  padding: 28,
  marginBottom: 24,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 24,
  marginBottom: 24,
};

const heroTopStyle: React.CSSProperties = {
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
  marginBottom: 10,
  color: "#111827",
};

const heroTextStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#4b5563",
  lineHeight: 1.5,
};

const heroInfoCardStyle: React.CSSProperties = {
  minWidth: 180,
  background: "#111827",
  color: "white",
  borderRadius: 18,
  padding: 18,
};

const heroInfoLabelStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.85,
  marginBottom: 8,
};

const heroInfoValueStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  lineHeight: 1,
};

const statsMiniGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12,
};

const miniStatStyle: React.CSSProperties = {
  background: "#f9fafb",
  borderRadius: 16,
  padding: 16,
};

const miniStatLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#6b7280",
  marginBottom: 8,
};

const miniStatValueStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  marginBottom: 12,
  color: "#111827",
};

const sectionSubtitleStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 14,
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 700,
  fontSize: 14,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  fontSize: 14,
  boxSizing: "border-box",
  background: "white",
};

const actionRowStyle: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const tableWrapStyle: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  minWidth: 980,
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
  color: "#374151",
};

const tdCenterStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  padding: 20,
  textAlign: "center",
  color: "#6b7280",
};

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const activePillStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #4ade80",
};

const inactivePillStyle: React.CSSProperties = {
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
};

const tableActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};

const darkLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  background: "#111827",
  color: "white",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
};

const smallDarkLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 10px",
  background: "#111827",
  color: "white",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 700,
};

const smallGrayLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 10px",
  background: "#9ca3af",
  color: "white",
  borderRadius: 8,
  textDecoration: "none",
  fontWeight: 700,
};

const grayButtonStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "none",
  background: "#9ca3af",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};