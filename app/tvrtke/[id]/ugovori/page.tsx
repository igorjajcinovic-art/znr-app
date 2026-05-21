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
  datumZaposlenja: string;
  grad: string | null;
  ulica: string | null;
  radnoMjesto: string | null;
};

const danasHr = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${now.getFullYear()}.`;
};

function formatDate(value: string | null) {
  if (!value) return "";

  if (value.includes("T")) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const day = String(date.getUTCDate()).padStart(2, "0");
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      return `${day}.${month}.${date.getUTCFullYear()}.`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}.${month}.${year}.`;
  }

  return value;
}

export default function UgovoriPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [radnikId, setRadnikId] = useState("");
  const [direktor, setDirektor] = useState("");
  const [datumUgovora, setDatumUgovora] = useState(danasHr());
  const [pocetakRada, setPocetakRada] = useState("");
  const [probniRok, setProbniRok] = useState("6 (šest) mjeseci");
  const [radnoMjesto, setRadnoMjesto] = useState("");
  const [mjestoRada, setMjestoRada] = useState("");
  const [placa, setPlaca] = useState("1.050,00 € bruto");
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

      const [tvrtkeRes, radniciRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const nadenaTvrtka = sveTvrtke.find((item) => item.id === firmaId) || null;

      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronađena.");

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);

      const queryRadnikId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("radnikId") || ""
          : "";

      if (queryRadnikId) {
        const radnik = radniciData.find((item) => item.id === queryRadnikId);

        if (radnik) {
          setRadnikId(radnik.id);
          setPocetakRada(formatDate(radnik.datumZaposlenja));
          setRadnoMjesto(radnik.radnoMjesto || "");
          setMjestoRada(radnik.grad || nadenaTvrtka.adresa || "");
        }
      }
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const aktivniRadnici = useMemo(
    () => radnici.filter((radnik) => radnik.aktivan),
    [radnici]
  );

  const odabraniRadnik = useMemo(
    () => radnici.find((radnik) => radnik.id === radnikId) || null,
    [radnici, radnikId]
  );

  const odaberiRadnika = (id: string) => {
    setRadnikId(id);
    const radnik = radnici.find((item) => item.id === id);

    if (!radnik) return;

    setPocetakRada(formatDate(radnik.datumZaposlenja));
    setRadnoMjesto(radnik.radnoMjesto || "");
    setMjestoRada(radnik.grad || tvrtka?.adresa || "");
  };

  const ugovorUrl = useMemo(() => {
    if (!firmaId || !radnikId) return "";

    const params = new URLSearchParams({
      firmaId,
      radnikId,
      direktor,
      datumUgovora,
      pocetakRada,
      probniRok,
      radnoMjesto,
      mjestoRada,
      placa,
    });

    return `/api/ispis/ugovor-rad?${params.toString()}`;
  }, [
    firmaId,
    radnikId,
    direktor,
    datumUgovora,
    pocetakRada,
    probniRok,
    radnoMjesto,
    mjestoRada,
    placa,
  ]);

  if (ucitavanje) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (greska || !tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>{greska || "Tvrtka nije pronađena."}</div>
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
            <div style={badgeStyle}>Baza obrazaca</div>
            <h1 style={titleStyle}>Ugovor o radu</h1>
            <div style={mutedStyle}>
              Predložak za ugovor o radu na neodređeno vrijeme prema učitanom
              primjeru.
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Podaci za ugovor</h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Radnik</label>
              <select
                value={radnikId}
                onChange={(event) => odaberiRadnika(event.target.value)}
                style={inputStyle}
              >
                <option value="">Odaberi radnika</option>
                {aktivniRadnici.map((radnik) => (
                  <option key={radnik.id} value={radnik.id}>
                    {radnik.ime} ({radnik.oib})
                  </option>
                ))}
              </select>
            </div>

            <Field label="Direktor / zastupnik">
              <input
                value={direktor}
                onChange={(event) => setDirektor(event.target.value)}
                style={inputStyle}
                placeholder="Ime i prezime direktora"
              />
            </Field>

            <Field label="Datum ugovora">
              <input
                value={datumUgovora}
                onChange={(event) => setDatumUgovora(event.target.value)}
                style={inputStyle}
                placeholder="dd.mm.gggg."
              />
            </Field>

            <Field label="Početak rada">
              <input
                value={pocetakRada}
                onChange={(event) => setPocetakRada(event.target.value)}
                style={inputStyle}
                placeholder="dd.mm.gggg."
              />
            </Field>

            <Field label="Radno mjesto">
              <input
                value={radnoMjesto}
                onChange={(event) => setRadnoMjesto(event.target.value)}
                style={inputStyle}
                placeholder="Radno mjesto"
              />
            </Field>

            <Field label="Mjesto rada">
              <input
                value={mjestoRada}
                onChange={(event) => setMjestoRada(event.target.value)}
                style={inputStyle}
                placeholder="Mjesto rada"
              />
            </Field>

            <Field label="Probni rok">
              <input
                value={probniRok}
                onChange={(event) => setProbniRok(event.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Plaća">
              <input
                value={placa}
                onChange={(event) => setPlaca(event.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {odabraniRadnik ? (
            <div style={previewBoxStyle}>
              <strong>Odabrani radnik:</strong> {odabraniRadnik.ime}, OIB{" "}
              {odabraniRadnik.oib}
            </div>
          ) : null}

          <div style={actionsStyle}>
            {ugovorUrl ? (
              <a href={ugovorUrl} target="_blank" rel="noreferrer" style={primaryLinkStyle}>
                Otvori ugovor za ispis
              </a>
            ) : (
              <button type="button" disabled style={disabledButtonStyle}>
                Odaberi radnika
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  background: "#f3f4f6",
  minHeight: "100vh",
  padding: 24,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1180,
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

const titleStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  margin: 0,
  marginBottom: 10,
  color: "#111827",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  marginBottom: 16,
  color: "#111827",
};

const mutedStyle: React.CSSProperties = {
  color: "#4b5563",
  lineHeight: 1.5,
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

const previewBoxStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 12,
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  color: "#374151",
};

const actionsStyle: React.CSSProperties = {
  marginTop: 18,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
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

const disabledButtonStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "none",
  background: "#9ca3af",
  color: "white",
  fontWeight: 700,
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};
