"use client";
import { useEffect, useMemo, useState } from "react";

type Radnik = {
  ime: string;
  oib: string;
  aktivan: boolean;
  datumOdjave: string;
  datumZaposlenja: string;
  datumRodjenja: string;
  grad: string;
  radnoMjesto: string;
  imaDozvolu: boolean;
  dozvolaDo: string;
  lijecnickiDo: string;
  znrOsposobljen: boolean;
  znrDatum: string;
  zopOsposobljen: boolean;
  zopDatum: string;
};

type StrucnoOsposobljavanje = {
  radnikOib: string;
  ime: string;
  oib: string;
  vrsta: string;
  datumOsposobljavanja: string;
  vrijediDo: string;
  napomena: string;
};

type Upozorenje = {
  ime: string;
  oib: string;
  vrsta: string;
  datum: string;
  status: string;
  level: "expired" | "warning";
};

const prazniPodaci: StrucnoOsposobljavanje = {
  radnikOib: "",
  ime: "",
  oib: "",
  vrsta: "",
  datumOsposobljavanja: "",
  vrijediDo: "",
  napomena: "",
};

export default function OsposobljavanjaPage() {
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [zapisi, setZapisi] = useState<StrucnoOsposobljavanje[]>([]);
  const [forma, setForma] = useState<StrucnoOsposobljavanje>(prazniPodaci);
  const [detalji, setDetalji] = useState<StrucnoOsposobljavanje | null>(null);

  const [filterOib, setFilterOib] = useState("");
  const [filterVrsta, setFilterVrsta] = useState("");
  const [samoUpozorenja, setSamoUpozorenja] = useState(false);

  useEffect(() => {
    const spremljeniRadnici = localStorage.getItem("radnici");
    if (spremljeniRadnici) {
      try {
        setRadnici(JSON.parse(spremljeniRadnici));
      } catch {
        setRadnici([]);
      }
    }

    const spremljenaOsposobljavanja = localStorage.getItem("osposobljavanja");
    if (spremljenaOsposobljavanja) {
      try {
        setZapisi(JSON.parse(spremljenaOsposobljavanja));
      } catch {
        setZapisi([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("osposobljavanja", JSON.stringify(zapisi));
  }, [zapisi]);

  const parseDate = (value: string) => {
    if (!value) return "";

    const v = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const matchDots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
    if (matchDots) {
      const [, d, m, y] = matchDots;
      const day = d.padStart(2, "0");
      const month = m.padStart(2, "0");
      return `${y}-${month}-${day}`;
    }

    const matchSlashes = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchSlashes) {
      const [, d, m, y] = matchSlashes;
      const day = d.padStart(2, "0");
      const month = m.padStart(2, "0");
      return `${y}-${month}-${day}`;
    }

    return "";
  };

  const formatDate = (value: string) => {
    if (!value) return "";
    const iso = parseDate(value) || value;
    const parts = iso.split("-");
    if (parts.length !== 3) return value;
    const [y, m, d] = parts;
    return `${d}.${m}.${y}`;
  };

  const daysUntil = (value: string) => {
    const iso = parseDate(value) || value;
    if (!iso) return null;

    const parts = iso.split("-");
    if (parts.length !== 3) return null;

    const [y, m, d] = parts;
    const target = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(target.getTime())) return null;

    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const t1 = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.ceil((t1.getTime() - t0.getTime()) / (1000 * 60 * 60 * 24));
  };

  const statusRoka = (value: string) => {
    const diff = daysUntil(value);

    if (diff === null) {
      return { text: "-", level: "none" as const };
    }

    if (diff < 0) {
      return {
        text: `Isteklo prije ${Math.abs(diff)} dana`,
        level: "expired" as const,
      };
    }

    if (diff <= 30) {
      return {
        text: `Istječe za ${diff} dana`,
        level: "warning" as const,
      };
    }

    return {
      text: `Važi još ${diff} dana`,
      level: "ok" as const,
    };
  };

  const odaberiRadnika = (oib: string) => {
    const radnik = radnici.find((r) => r.oib === oib);

    if (!radnik) {
      setForma((prev) => ({
        ...prev,
        radnikOib: "",
        ime: "",
        oib: "",
      }));
      return;
    }

    setForma((prev) => ({
      ...prev,
      radnikOib: radnik.oib,
      ime: radnik.ime,
      oib: radnik.oib,
    }));
  };

  const dodajZapis = () => {
    if (
      !forma.radnikOib ||
      !forma.ime ||
      !forma.oib ||
      !forma.vrsta ||
      !forma.datumOsposobljavanja ||
      !forma.vrijediDo
    ) {
      alert("Odaberi radnika i unesi sva obavezna polja.");
      return;
    }

    const datumOsposobljavanja = parseDate(forma.datumOsposobljavanja);
    const vrijediDo = parseDate(forma.vrijediDo);

    if (!datumOsposobljavanja) {
      alert("Datum osposobljavanja mora biti u obliku dd.mm.gggg");
      return;
    }

    if (!vrijediDo) {
      alert("Datum vrijedi do mora biti u obliku dd.mm.gggg");
      return;
    }

    const novi: StrucnoOsposobljavanje = {
      ...forma,
      datumOsposobljavanja,
      vrijediDo,
    };

    setZapisi((prev) => [...prev, novi]);
    setForma(prazniPodaci);
  };

  const obrisiZapis = (index: number) => {
    if (!confirm("Obrisati stručno osposobljavanje?")) return;
    const kopija = [...zapisi];
    kopija.splice(index, 1);
    setZapisi(kopija);
  };

  const upozorenja = useMemo(() => {
    const lista: Upozorenje[] = [];

    zapisi.forEach((z) => {
      const s = statusRoka(z.vrijediDo);
      if (s.level === "expired" || s.level === "warning") {
        lista.push({
          ime: z.ime,
          oib: z.oib,
          vrsta: z.vrsta,
          datum: formatDate(z.vrijediDo),
          status: s.text,
          level: s.level,
        });
      }
    });

    return lista;
  }, [zapisi]);

  const filtriraniZapisi = useMemo(() => {
    return zapisi.filter((z) => {
      const okOib = !filterOib || z.oib.includes(filterOib);
      const okVrsta =
        !filterVrsta ||
        z.vrsta.toLowerCase().includes(filterVrsta.toLowerCase());

      const s = statusRoka(z.vrijediDo);
      const okUpozorenje =
        !samoUpozorenja || s.level === "expired" || s.level === "warning";

      return okOib && okVrsta && okUpozorenje;
    });
  }, [zapisi, filterOib, filterVrsta, samoUpozorenja]);

  const exportCSV = () => {
    const header = [
      "Ime i prezime",
      "OIB",
      "Vrsta stručnog osposobljavanja",
      "Datum osposobljavanja",
      "Vrijedi do",
      "Napomena",
    ];

    const rows = zapisi.map((z) => [
      z.ime,
      z.oib,
      z.vrsta,
      formatDate(z.datumOsposobljavanja),
      formatDate(z.vrijediDo),
      z.napomena,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strucna-osposobljavanja.csv";
    a.click();
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const text = String(event.target?.result || "");
      const lines = text.split(/\r?\n/).filter((x) => x.trim() !== "");
      if (lines.length < 2) return;

      const data = lines.slice(1).map((line) => {
        const cols = line
          .split(";")
          .map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));

        const z: StrucnoOsposobljavanje = {
          radnikOib: cols[1] || "",
          ime: cols[0] || "",
          oib: cols[1] || "",
          vrsta: cols[2] || "",
          datumOsposobljavanja: parseDate(cols[3] || ""),
          vrijediDo: parseDate(cols[4] || ""),
          napomena: cols[5] || "",
        };

        return z;
      });

      setZapisi((prev) => [...prev, ...data.filter((z) => z.ime || z.oib)]);
      e.target.value = "";
    };

    reader.readAsText(file, "utf-8");
  };

  const box: React.CSSProperties = {
    background: "white",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    marginBottom: 20,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    fontWeight: 600,
    fontSize: 14,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  };

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 34, fontWeight: 700, marginBottom: 20 }}>
          Stručna osposobljavanja
        </h1>

        <div style={box}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
            Upozorenja
          </h2>

          {upozorenja.length === 0 ? (
            <div>Nema upozorenja.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {upozorenja.map((u, i) => (
                <div
                  key={i}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid",
                    background: u.level === "expired" ? "#fee2e2" : "#fef3c7",
                    borderColor: u.level === "expired" ? "#f87171" : "#fbbf24",
                    color: u.level === "expired" ? "#991b1b" : "#92400e",
                  }}
                >
                  <strong>{u.ime}</strong> — {u.vrsta} — {u.datum} — {u.status}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={box}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
            Unos stručnog osposobljavanja
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Radnik</label>
              <select
                style={inputStyle}
                value={forma.radnikOib}
                onChange={(e) => odaberiRadnika(e.target.value)}
              >
                <option value="">Odaberi radnika</option>
                {radnici
                  .filter((r) => r.aktivan)
                  .map((r) => (
                    <option key={r.oib} value={r.oib}>
                      {r.ime} — {r.oib}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Ime i prezime</label>
              <input
                style={inputStyle}
                value={forma.ime}
                readOnly
                placeholder="Automatski iz radnika"
              />
            </div>

            <div>
              <label style={labelStyle}>OIB</label>
              <input
                style={inputStyle}
                value={forma.oib}
                readOnly
                placeholder="Automatski iz radnika"
              />
            </div>

            <div>
              <label style={labelStyle}>Vrsta stručnog osposobljavanja</label>
              <input
                style={inputStyle}
                value={forma.vrsta}
                onChange={(e) => setForma({ ...forma, vrsta: e.target.value })}
                placeholder="Npr. rukovanje viličarom"
              />
            </div>

            <div>
              <label style={labelStyle}>Datum osposobljavanja</label>
              <input
                style={inputStyle}
                value={formatDate(forma.datumOsposobljavanja)}
                onChange={(e) =>
                  setForma({ ...forma, datumOsposobljavanja: e.target.value })
                }
                placeholder="dd.mm.gggg"
              />
            </div>

            <div>
              <label style={labelStyle}>Vrijedi do</label>
              <input
                style={inputStyle}
                value={formatDate(forma.vrijediDo)}
                onChange={(e) => setForma({ ...forma, vrijediDo: e.target.value })}
                placeholder="dd.mm.gggg"
              />
            </div>

            <div style={{ gridColumn: "1 / span 3" }}>
              <label style={labelStyle}>Napomena</label>
              <input
                style={inputStyle}
                value={forma.napomena}
                onChange={(e) => setForma({ ...forma, napomena: e.target.value })}
                placeholder="Napomena"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <button
              style={{ ...buttonStyle, background: "black", color: "white" }}
              onClick={dodajZapis}
            >
              Dodaj stručno osposobljavanje
            </button>

            <button
              style={{ ...buttonStyle, background: "#16a34a", color: "white" }}
              onClick={exportCSV}
            >
              Export CSV
            </button>

            <label
              style={{
                ...buttonStyle,
                background: "#2563eb",
                color: "white",
                display: "inline-block",
              }}
            >
              Import CSV
              <input type="file" accept=".csv" onChange={importCSV} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        <div style={box}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
            Filteri
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
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
              <label style={labelStyle}>Vrsta osposobljavanja</label>
              <input
                style={inputStyle}
                value={filterVrsta}
                onChange={(e) => setFilterVrsta(e.target.value)}
                placeholder="Vrsta stručnog osposobljavanja"
              />
            </div>

            <div>
              <label style={labelStyle}>Samo upozorenja</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, height: 42 }}>
                <input
                  type="checkbox"
                  checked={samoUpozorenja}
                  onChange={(e) => setSamoUpozorenja(e.target.checked)}
                />
                <span>Prikaži</span>
              </div>
            </div>
          </div>
        </div>

        <div style={box}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={thStyle}>Ime i prezime</th>
                <th style={thStyle}>OIB</th>
                <th style={thStyle}>Vrsta</th>
                <th style={thStyle}>Datum osposobljavanja</th>
                <th style={thStyle}>Vrijedi do</th>
                <th style={thStyle}>Napomena</th>
                <th style={thStyle}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtriraniZapisi.length === 0 ? (
                <tr>
                  <td colSpan={7} style={tdStyleCenter}>
                    Nema stručnih osposobljavanja za prikaz.
                  </td>
                </tr>
              ) : (
                filtriraniZapisi.map((z, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{z.ime}</td>
                    <td style={tdStyle}>{z.oib}</td>
                    <td style={tdStyle}>{z.vrsta}</td>
                    <td style={tdStyle}>{formatDate(z.datumOsposobljavanja)}</td>
                    <td style={tdStyle}>{formatDate(z.vrijediDo)}</td>
                    <td style={tdStyle}>{z.napomena}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setDetalji(z)}>Detalji</button>
                        <button onClick={() => obrisiZapis(i)}>Obriši</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {detalji && (
          <div
            onClick={() => setDetalji(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "white",
                borderRadius: 14,
                padding: 24,
                width: "100%",
                maxWidth: 700,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontSize: 28, fontWeight: 700 }}>Detalji stručnog osposobljavanja</h2>
                <button onClick={() => setDetalji(null)}>Zatvori</button>
              </div>

              <div style={detaljBox}>
                <Detalj red="Ime i prezime" value={detalji.ime} />
                <Detalj red="OIB" value={detalji.oib} />
                <Detalj red="Vrsta" value={detalji.vrsta} />
                <Detalj red="Datum osposobljavanja" value={formatDate(detalji.datumOsposobljavanja)} />
                <Detalj red="Vrijedi do" value={formatDate(detalji.vrijediDo)} />
                <Detalj red="Napomena" value={detalji.napomena || "-"} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detalj({ red, value }: { red: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <strong>{red}:</strong> {value}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 10,
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 10,
};

const tdStyleCenter: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 16,
  textAlign: "center",
  color: "#6b7280",
};

const detaljBox: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: 16,
};