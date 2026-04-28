"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Radnik = {
  id: string;
  firmaId: string;
  ime: string;
  oib: string;
};

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
};

type Oprema = {
  id: string;
  firmaId: string;
  oib: string;
  vrsta: string;
  datumIzdavanja: string;
  kolicina: number;
  rokZamjene: string | null;
  napomena: string | null;
};

type FormaOprema = {
  oib: string;
  vrsta: string;
  datumIzdavanja: string;
  kolicina: string;
  rokZamjene: string;
  napomena: string;
};

type CsvImportRow = {
  oib: string;
  vrsta: string;
  datumIzdavanja: string;
  kolicina: string;
  rokZamjene: string;
  napomena: string;
};

const praznaForma: FormaOprema = {
  oib: "",
  vrsta: "",
  datumIzdavanja: "",
  kolicina: "1",
  rokZamjene: "",
  napomena: "",
};

export default function OpremaPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [oprema, setOprema] = useState<Oprema[]>([]);
  const [forma, setForma] = useState<FormaOprema>(praznaForma);
  const [editId, setEditId] = useState<string | null>(null);

  const [filterRadnik, setFilterRadnik] = useState("");
  const [filterVrsta, setFilterVrsta] = useState("");
  const [filterRok, setFilterRok] = useState("svi");

  const [ucitavanje, setUcitavanje] = useState(true);
  const [spremanje, setSpremanje] = useState(false);
  const [importanje, setImportanje] = useState(false);
  const [greska, setGreska] = useState("");

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  const ucitajSve = async () => {
    try {
      setGreska("");
      setUcitavanje(true);

      const [tvrtkeRes, radniciRes, opremaRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/oprema?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!opremaRes.ok) throw new Error("Ne mogu učitati opremu.");

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const opremaData: Oprema[] = await opremaRes.json();

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;
      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronađena.");

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);
      setOprema(opremaData);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const parseDate = (value: string) => {
    if (!value) return "";

    const v = value.trim();

    if (v.includes("T")) return v.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

    const dots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
    if (dots) {
      const [, d, m, y] = dots;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const slashes = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashes) {
      const [, d, m, y] = slashes;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return "";
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

  const daysUntil = (value: string | null) => {
    if (!value) return null;

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
    if (!value) return { text: "-", level: "none" as const };

    const diff = daysUntil(value);

    if (diff === null) return { text: "-", level: "none" as const };
    if (diff < 0) return { text: `Zamjena istekla prije ${Math.abs(diff)} dana`, level: "expired" as const };
    if (diff <= 30) return { text: `Zamjena za ${diff} dana`, level: "warning" as const };
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

  const csvEscape = (value: string | number | boolean | null | undefined) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const exportOpremaCsv = () => {
    const headers = [
      "Ime i prezime",
      "OIB",
      "Vrsta opreme",
      "Datum izdavanja",
      "Količina",
      "Rok zamjene",
      "Status",
      "Napomena",
    ];

    const rows = filtriranaOprema.map((z) => {
      const radnik = radnici.find((r) => r.oib === z.oib);

      return [
        radnik?.ime || "",
        z.oib,
        z.vrsta,
        formatDate(z.datumIzdavanja),
        z.kolicina,
        formatDate(z.rokZamjene),
        statusRoka(z.rokZamjene).text,
        z.napomena || "",
      ];
    });

    const csv = [
      headers.map(csvEscape).join(";"),
      ...rows.map((row) => row.map(csvEscape).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oprema-${tvrtka?.naziv || "tvrtka"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ";" || char === ",") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const normalizeHeader = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const readCsvRows = (text: string): CsvImportRow[] => {
    const lines = text
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const header = parseCsvLine(lines[0]).map(normalizeHeader);

    const indexOf = (...aliases: string[]) => {
      const normalizedAliases = aliases.map(normalizeHeader);
      return header.findIndex((h) => normalizedAliases.includes(h));
    };

    const idxOib = indexOf("oib");
    const idxVrsta = indexOf("vrsta opreme", "vrsta");
    const idxDatumIzdavanja = indexOf("datum izdavanja", "izdavanje");
    const idxKolicina = indexOf("kolicina", "količina");
    const idxRokZamjene = indexOf("rok zamjene");
    const idxNapomena = indexOf("napomena");

    return lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);
      const get = (index: number) => (index >= 0 ? cols[index] ?? "" : "");

      return {
        oib: get(idxOib),
        vrsta: get(idxVrsta),
        datumIzdavanja: get(idxDatumIzdavanja),
        kolicina: get(idxKolicina),
        rokZamjene: get(idxRokZamjene),
        napomena: get(idxNapomena),
      };
    });
  };

  const importCsv = async () => {
    if (!firmaId) {
      alert("Nedostaje ID tvrtke.");
      return;
    }

    if (!csvFile) {
      alert("Odaberi CSV file.");
      return;
    }

    try {
      setImportanje(true);
      setGreska("");

      const text = await csvFile.text();
      const rows = readCsvRows(text);

      if (rows.length === 0) {
        throw new Error("CSV nema podataka ili zaglavlje nije ispravno.");
      }

      const res = await fetch("/api/oprema/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firmaId,
          rows,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Greška kod uvoza CSV-a.");
      }

      const result = await res.json();

      alert(
        `Uvoz završen.\nUvezeno: ${result.imported}\nPreskočeno: ${result.skipped}`
      );

      setCsvFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška kod uvoza.");
    } finally {
      setImportanje(false);
    }
  };

  const filtriranaOprema = useMemo(() => {
    return oprema.filter((z) => {
      const radnik = radnici.find((r) => r.oib === z.oib);
      const level = statusRoka(z.rokZamjene).level;

      const okRadnik =
        !filterRadnik ||
        (radnik?.ime || "").toLowerCase().includes(filterRadnik.toLowerCase());

      const okVrsta =
        !filterVrsta || z.vrsta.toLowerCase().includes(filterVrsta.toLowerCase());

      const okRok =
        filterRok === "svi" ||
        (filterRok === "isteklo" && level === "expired") ||
        (filterRok === "uskoro" && level === "warning") ||
        (filterRok === "vazeci" && level === "ok");

      return okRadnik && okVrsta && okRok;
    });
  }, [oprema, radnici, filterRadnik, filterVrsta, filterRok]);

  const spremi = async () => {
    if (!firmaId) {
      alert("Nedostaje ID tvrtke.");
      return;
    }

    if (!forma.oib || !forma.vrsta || !forma.datumIzdavanja) {
      alert("Unesi radnika, vrstu i datum izdavanja.");
      return;
    }

    const datumIzdavanja = parseDate(forma.datumIzdavanja);
    if (!datumIzdavanja) {
      alert("Datum izdavanja mora biti u obliku dd.mm.gggg");
      return;
    }

    const rokZamjene = forma.rokZamjene ? parseDate(forma.rokZamjene) : "";
    if (forma.rokZamjene && !rokZamjene) {
      alert("Rok zamjene mora biti u obliku dd.mm.gggg");
      return;
    }

    const payload = {
      firmaId,
      oib: forma.oib,
      vrsta: forma.vrsta.trim(),
      datumIzdavanja,
      kolicina: Number(forma.kolicina || "1"),
      rokZamjene: rokZamjene || null,
      napomena: forma.napomena.trim() || null,
    };

    try {
      setSpremanje(true);
      setGreska("");

      const res = await fetch(
        editId ? `/api/oprema/${editId}` : "/api/oprema",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti opremu.");
      }

      setForma(praznaForma);
      setEditId(null);
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri spremanju.");
    } finally {
      setSpremanje(false);
    }
  };

  const pokreniUredenje = (z: Oprema) => {
    setForma({
      oib: z.oib,
      vrsta: z.vrsta,
      datumIzdavanja:
        formatDate(z.datumIzdavanja) === "-" ? "" : formatDate(z.datumIzdavanja),
      kolicina: String(z.kolicina),
      rokZamjene: formatDate(z.rokZamjene) === "-" ? "" : formatDate(z.rokZamjene),
      napomena: z.napomena || "",
    });

    setEditId(z.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const obrisi = async (id: string) => {
    if (!confirm("Obrisati zapis opreme?")) return;

    try {
      const res = await fetch(`/api/oprema/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati zapis.");
      }
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  };

  if (ucitavanje) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (!tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>Tvrtka nije pronađena.</div>
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
          <div style={heroBadgeStyle}>Modul</div>
          <h1 style={heroTitleStyle}>Osobna zaštitna oprema</h1>
          <p style={heroTextStyle}>
            Tvrtka: <strong>{tvrtka.naziv}</strong>
          </p>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Uvoz opreme iz CSV-a</h2>

          <div style={helperTextStyle}>
            CSV treba imati barem stupce:
            <strong> OIB</strong>, <strong>Vrsta opreme</strong>,
            <strong> Datum izdavanja</strong>.
            Može imati i Količina, Rok zamjene i Napomena.
          </div>

          <div style={uploadGridStyle}>
            <div>
              <label style={labelStyle}>Odaberi CSV file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={inputStyle}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setCsvFile(file);
                }}
              />
            </div>

            <div>
              <button
                style={blackButtonStyle}
                onClick={importCsv}
                disabled={importanje}
              >
                {importanje ? "Uvoz..." : "Uvezi CSV"}
              </button>
            </div>
          </div>

          {csvFile && (
            <div style={{ marginTop: 12, color: "#374151" }}>
              Odabrani file: <strong>{csvFile.name}</strong>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            {editId ? "Uređenje opreme" : "Unos opreme"}
          </h2>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Radnik</label>
              <select
                style={inputStyle}
                value={forma.oib}
                onChange={(e) => setForma({ ...forma, oib: e.target.value })}
              >
                <option value="">Odaberi radnika</option>
                {radnici.map((r) => (
                  <option key={r.id} value={r.oib}>
                    {r.ime} ({r.oib})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Vrsta opreme</label>
              <input
                style={inputStyle}
                value={forma.vrsta}
                onChange={(e) => setForma({ ...forma, vrsta: e.target.value })}
                placeholder="npr. zaštitne cipele"
              />
            </div>

            <div>
              <label style={labelStyle}>Datum izdavanja</label>
              <input
                style={inputStyle}
                value={forma.datumIzdavanja}
                onChange={(e) =>
                  setForma({ ...forma, datumIzdavanja: e.target.value })
                }
                placeholder="dd.mm.gggg"
              />
            </div>

            <div>
              <label style={labelStyle}>Količina</label>
              <input
                style={inputStyle}
                value={forma.kolicina}
                onChange={(e) => setForma({ ...forma, kolicina: e.target.value })}
                placeholder="1"
              />
            </div>

            <div>
              <label style={labelStyle}>Rok zamjene</label>
              <input
                style={inputStyle}
                value={forma.rokZamjene}
                onChange={(e) =>
                  setForma({ ...forma, rokZamjene: e.target.value })
                }
                placeholder="dd.mm.gggg"
              />
            </div>

            <div>
              <label style={labelStyle}>Napomena</label>
              <input
                style={inputStyle}
                value={forma.napomena}
                onChange={(e) => setForma({ ...forma, napomena: e.target.value })}
                placeholder="Napomena"
              />
            </div>
          </div>

          <div style={actionRowStyle}>
            <button style={blackButtonStyle} onClick={spremi} disabled={spremanje}>
              {spremanje ? "Spremanje..." : editId ? "Spremi izmjene" : "Dodaj opremu"}
            </button>

            {editId && (
              <button
                style={grayButtonStyle}
                onClick={() => {
                  setForma(praznaForma);
                  setEditId(null);
                }}
              >
                Odustani
              </button>
            )}
          </div>

          {greska && <div style={errorBoxStyle}>{greska}</div>}
        </div>

        <div style={cardStyle}>
          <div style={tableHeaderStyle}>
            <div>
              <h2 style={{ ...sectionTitleStyle, marginBottom: 4 }}>
                Popis opreme
              </h2>
              <div style={sectionSubtitleStyle}>
                Pregled svih zapisa opreme za ovu tvrtku.
              </div>
            </div>

            <button style={grayButtonStyle} onClick={exportOpremaCsv}>
              Izvoz CSV
            </button>
          </div>

          <div style={filterGridStyle}>
            <div>
              <label style={labelStyle}>Radnik</label>
              <input
                style={inputStyle}
                value={filterRadnik}
                onChange={(e) => setFilterRadnik(e.target.value)}
                placeholder="Pretraga po radniku"
              />
            </div>

            <div>
              <label style={labelStyle}>Vrsta</label>
              <input
                style={inputStyle}
                value={filterVrsta}
                onChange={(e) => setFilterVrsta(e.target.value)}
                placeholder="Vrsta opreme"
              />
            </div>

            <div>
              <label style={labelStyle}>Rok</label>
              <select
                style={inputStyle}
                value={filterRok}
                onChange={(e) => setFilterRok(e.target.value)}
              >
                <option value="svi">Svi</option>
                <option value="isteklo">Isteklo</option>
                <option value="uskoro">Istječe uskoro</option>
                <option value="vazeci">Važeći</option>
              </select>
            </div>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Radnik</th>
                  <th style={thStyle}>Vrsta</th>
                  <th style={thStyle}>Datum izdavanja</th>
                  <th style={thStyle}>Količina</th>
                  <th style={thStyle}>Rok zamjene</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Napomena</th>
                  <th style={thStyle}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filtriranaOprema.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={tdCenterStyle}>
                      Nema zapisa.
                    </td>
                  </tr>
                ) : (
                  filtriranaOprema.map((z) => {
                    const radnik = radnici.find((r) => r.oib === z.oib);
                    return (
                      <tr key={z.id}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: "#111827" }}>
                            {radnik?.ime || z.oib}
                          </div>
                          <div style={{ color: "#6b7280", fontSize: 12 }}>
                            {z.oib}
                          </div>
                        </td>
                        <td style={tdStyle}>{z.vrsta}</td>
                        <td style={tdStyle}>{formatDate(z.datumIzdavanja)}</td>
                        <td style={tdStyle}>{z.kolicina}</td>
                        <td style={tdStyle}>{formatDate(z.rokZamjene)}</td>
                        <td style={tdStyle}>
                          <span style={{ ...pillStyle, ...statusStyle(z.rokZamjene) }}>
                            {statusRoka(z.rokZamjene).text}
                          </span>
                        </td>
                        <td style={tdStyle}>{z.napomena || "-"}</td>
                        <td style={tdStyle}>
                          <div style={tableActionsStyle}>
                            <button
                              style={smallGrayButtonStyle}
                              onClick={() => pokreniUredenje(z)}
                            >
                              Uredi
                            </button>
                            <button
                              style={smallRedButtonStyle}
                              onClick={() => obrisi(z.id)}
                            >
                              Obriši
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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

const sectionSubtitleStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 14,
};

const helperTextStyle: React.CSSProperties = {
  marginBottom: 12,
  color: "#4b5563",
  lineHeight: 1.6,
};

const uploadGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 16,
  alignItems: "end",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 20,
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

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const tableActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 10,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};

const blackButtonStyle: React.CSSProperties = {
  padding: "11px 16px",
  borderRadius: 10,
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
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

const smallGrayButtonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  background: "#9ca3af",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const smallRedButtonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};