"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
};

type Forma = {
  naziv: string;
  oib: string;
  adresa: string;
};

const praznaForma: Forma = {
  naziv: "",
  oib: "",
  adresa: "",
};

export default function TvrtkePage() {
  const [tvrtke, setTvrtke] = useState<Tvrtka[]>([]);
  const [forma, setForma] = useState<Forma>(praznaForma);
  const [pretraga, setPretraga] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    ucitajTvrtke();
  }, []);

  const ucitajTvrtke = async () => {
    try {
      setLoading(true);
      setGreska("");

      const res = await fetch("/api/tvrtke", { cache: "no-store" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu učitati tvrtke.");
      }

      const data: Tvrtka[] = await res.json();
      setTvrtke(data);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  };

  const filtriraneTvrtke = useMemo(() => {
    const q = pretraga.trim().toLowerCase();

    if (!q) return tvrtke;

    return tvrtke.filter((t) => {
      return (
        t.naziv.toLowerCase().includes(q) ||
        t.oib.toLowerCase().includes(q) ||
        (t.adresa || "").toLowerCase().includes(q)
      );
    });
  }, [tvrtke, pretraga]);

  const spremiTvrtku = async () => {
    try {
      setGreska("");

      if (!forma.naziv.trim() || !forma.oib.trim()) {
        setGreska("Naziv i OIB su obavezni.");
        return;
      }

      setSaving(true);

      const res = await fetch("/api/tvrtke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          naziv: forma.naziv.trim(),
          oib: forma.oib.trim(),
          adresa: forma.adresa.trim() || null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti tvrtku.");
      }

      setForma(praznaForma);
      await ucitajTvrtke();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri spremanju.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={heroCardStyle}>
          <div>
            <div style={badgeStyle}>ZNR aplikacija</div>
            <h1 style={heroTitleStyle}>Tvrtke</h1>
            <div style={heroTextStyle}>
              Odaberi postojeću tvrtku ili dodaj novu.
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Dodaj tvrtku</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Naziv *</label>
              <input
                value={forma.naziv}
                onChange={(e) =>
                  setForma((p) => ({ ...p, naziv: e.target.value }))
                }
                style={inputStyle}
                placeholder="Naziv tvrtke"
              />
            </div>

            <div>
              <label style={labelStyle}>OIB *</label>
              <input
                value={forma.oib}
                onChange={(e) =>
                  setForma((p) => ({ ...p, oib: e.target.value }))
                }
                style={inputStyle}
                placeholder="OIB"
              />
            </div>

            <div>
              <label style={labelStyle}>Adresa</label>
              <input
                value={forma.adresa}
                onChange={(e) =>
                  setForma((p) => ({ ...p, adresa: e.target.value }))
                }
                style={inputStyle}
                placeholder="Adresa"
              />
            </div>
          </div>

          {greska ? <div style={errorStyle}>{greska}</div> : null}

          <div style={actionsRowStyle}>
            <button
              type="button"
              onClick={spremiTvrtku}
              disabled={saving}
              style={primaryButtonStyle}
            >
              {saving ? "Spremanje..." : "Dodaj tvrtku"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTopStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Popis tvrtki</h2>
              <div style={mutedStyle}>Ukupno: {tvrtke.length}</div>
            </div>

            <div style={{ minWidth: 280 }}>
              <input
                value={pretraga}
                onChange={(e) => setPretraga(e.target.value)}
                style={inputStyle}
                placeholder="Pretraži naziv, OIB ili adresu..."
              />
            </div>
          </div>

          {filtriraneTvrtke.length === 0 ? (
            <div style={emptyStyle}>Nema tvrtki za prikaz.</div>
          ) : (
            <div style={gridStyle}>
              {filtriraneTvrtke.map((tvrtka) => (
                <div key={tvrtka.id} style={companyCardStyle}>
                  <div style={companyTopStyle}>
                    <div>
                      <h3 style={companyTitleStyle}>{tvrtka.naziv}</h3>
                      <div style={companyMetaStyle}>
                        <strong>OIB:</strong> {tvrtka.oib}
                      </div>
                      <div style={companyMetaStyle}>
                        <strong>Adresa:</strong> {tvrtka.adresa || "-"}
                      </div>
                    </div>
                  </div>

                  <div style={companyActionsStyle}>
                    <Link
                      href={`/tvrtke/${tvrtka.id}`}
                      style={primaryLinkStyle}
                    >
                      Otvori dashboard
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
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
  fontSize: 38,
  fontWeight: 800,
  margin: 0,
  marginBottom: 10,
  color: "#111827",
};

const heroTextStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#4b5563",
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 24,
  marginBottom: 24,
};

const sectionTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  marginBottom: 12,
  color: "#111827",
};

const mutedStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 14,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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

const actionsRowStyle: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  gap: 10,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
  fontWeight: 600,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f9fafb",
  color: "#6b7280",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const companyCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 20,
  background: "#ffffff",
  display: "flex",
  flexDirection: "column",
  minHeight: 190,
};

const companyTopStyle: React.CSSProperties = {
  flex: 1,
};

const companyTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
  margin: 0,
  marginBottom: 12,
};

const companyMetaStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#374151",
  marginBottom: 6,
};

const companyActionsStyle: React.CSSProperties = {
  marginTop: 18,
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