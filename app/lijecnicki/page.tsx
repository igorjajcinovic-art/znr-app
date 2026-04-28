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

type LijecnickiPregled = {
  radnikOib: string;
  ime: string;
  oib: string;
  vrijediOd: string;
  vrijediDo: string;
  tocke: string;
  napomena: string;
};

type Upozorenje = {
  ime: string;
  oib: string;
  datum: string;
  status: string;
  level: "expired" | "warning";
};

const prazniPodaci: LijecnickiPregled = {
  radnikOib: "",
  ime: "",
  oib: "",
  vrijediOd: "",
  vrijediDo: "",
  tocke: "",
  napomena: "",
};

export default function LijecnickiPage() {
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [pregledi, setPregledi] = useState<LijecnickiPregled[]>([]);
  const [forma, setForma] = useState<LijecnickiPregled>(prazniPodaci);
  const [detalji, setDetalji] = useState<LijecnickiPregled | null>(null);

  const [filterOib, setFilterOib] = useState("");
  const [filterTocke, setFilterTocke] = useState("");
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

    const spremljeniPregledi = localStorage.getItem("lijecnicki-pregledi");
    if (spremljeniPregledi) {
      try {
        setPregledi(JSON.parse(spremljeniPregledi));
      } catch {
        setPregledi([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lijecnicki-pregledi", JSON.stringify(pregledi));
  }, [pregledi]);

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

  const dodajPregled = () => {
    if (!forma.radnikOib || !forma.ime || !forma.oib || !forma.vrijediOd || !forma.vrijediDo) {
      alert("Odaberi radnika i unesi vrijedi od / vrijedi do.");
      return;
    }

    const vrijediOd = parseDate(forma.vrijediOd);
    const vrijediDo = parseDate(forma.vrijediDo);

    if (!vrijediOd) {
      alert("Datum 'vrijedi od' mora biti u obliku dd.mm.gggg");
      return;
    }

    if (!vrijediDo) {
      alert("Datum 'vrijedi do' mora biti u obliku dd.mm.gggg");
      return;
    }

    const novi: LijecnickiPregled = {
      ...forma,
      vrijediOd,
      vrijediDo,
    };

    setPregledi((prev) => [...prev, novi]);
    setForma(prazniPodaci);
  };

  const obrisiPregled = (index: number) => {
    if (!confirm("Obrisati pregled?")) return;
    const kopija = [...pregledi];
    kopija.splice(index, 1);
    setPregledi(kopija);
  };

  const upozorenja = useMemo(() => {
    const lista: Upozorenje[] = [];

    pregledi.forEach((p) => {
      const s = statusRoka(p.vrijediDo);
      if (s.level === "expired" || s.level === "warning") {
        lista.push({
          ime: p.ime,
          oib: p.oib,
          datum: formatDate(p.vrijediDo),
          status: s.text,
          level: s.level,
        });
      }
    });

    return lista;
  }, [pregledi]);

  const filtriraniPregledi = useMemo(() => {
    return pregledi.filter((p) => {
      const okOib = !filterOib || p.oib.includes(filterOib);
      const okTocke =
        !filterTocke ||
        p.tocke.toLowerCase().includes(filterTocke.toLowerCase());

      const s = statusRoka(p.vrijediDo);
      const okUpozorenje =
        !samoUpozorenja || s.level === "expired" || s.level === "warning";

      return okOib && okTocke && okUpozorenje;
    });
  }, [pregledi, filterOib, filterTocke, samoUpozorenja]);

  const exportCSV = () => {
    const header = [
      "Ime i prezime",
      "OIB",
      "Vrijedi od",
      "Vrijedi do",
      "Točke",
      "Napomena",
    ];

    const rows = pregledi.map((p) => [
      p.ime,
      p.oib,
      formatDate(p.vrijediOd),
      formatDate(p.vrijediDo),
      p.tocke,
      p.napomena,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lijecnicki-pregledi.csv";
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

        const p: LijecnickiPregled = {
          radnikOib: cols[1] || "",
          ime: cols[0] || "",
          oib: cols[1] || "",
          vrijediOd: parseDate(cols[2] || ""),
          vrijediDo: parseDate(cols[3] || ""),
          tocke: cols[4] || "",
          napomena: cols[5] || "",
        };

        return p;
      });

      setPregledi((prev) => [...prev, ...data.filter((p) => p.ime || p.oib)]);
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
          Liječnički pregledi
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
                  <strong>{u.ime}</strong> — {u.datum} — {u.status}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={box}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 14 }}>
            Unos liječničkog pregleda
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
              <label style={labelStyle}>Vrijedi od</label>
              <input
                style={inputStyle}
                value={formatDate(forma.vrijediOd)}
                onChange={(e) => setForma({ ...forma, vrijediOd: e.target.value })}
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

            <div>
              <label style={labelStyle}>Točke</label>
              <input
                style={inputStyle}
                value={forma.tocke}
                onChange={(e) => setForma({ ...forma, tocke: e.target.value })}
                placeholder="Točke"
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
              onClick={dodajPregled}
            >
              Dodaj pregled
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
              <label style={labelStyle}>Točke</label>
              <input
                style={inputStyle}
                value={filterTocke}
                onChange={(e) => setFilterTocke(e.target.value)}
                placeholder="Točke"
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
                <th style={thStyle}>Vrijedi od</th>
                <th style={thStyle}>Vrijedi do</th>
                <th style={thStyle}>Točke</th>
                <th style={thStyle}>Napomena</th>
                <th style={thStyle}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtriraniPregledi.length === 0 ? (
                <tr>
                  <td colSpan={7} style={tdStyleCenter}>
                    Nema pregleda za prikaz.
                  </td>
                </tr>
              ) : (
                filtriraniPregledi.map((p, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{p.ime}</td>
                    <td style={tdStyle}>{p.oib}</td>
                    <td style={tdStyle}>{formatDate(p.vrijediOd)}</td>
                    <td style={tdStyle}>{formatDate(p.vrijediDo)}</td>
                    <td style={tdStyle}>{p.tocke}</td>
                    <td style={tdStyle}>{p.napomena}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setDetalji(p)}>Detalji</button>
                        <button onClick={() => obrisiPregled(i)}>Obriši</button>
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
                <h2 style={{ fontSize: 28, fontWeight: 700 }}>Detalji pregleda</h2>
                <button onClick={() => setDetalji(null)}>Zatvori</button>
              </div>

              <div style={detaljBox}>
                <Detalj red="Ime i prezime" value={detalji.ime} />
                <Detalj red="OIB" value={detalji.oib} />
                <Detalj red="Vrijedi od" value={formatDate(detalji.vrijediOd)} />
                <Detalj red="Vrijedi do" value={formatDate(detalji.vrijediDo)} />
                <Detalj red="Točke" value={detalji.tocke || "-"} />
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