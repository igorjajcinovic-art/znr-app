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

type Osposobljavanje = {
  id: string;
  firmaId: string;
  oib: string;
  vrsta: string;
  datum: string;
  vrijediDo: string;
  napomena: string | null;
};

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
};

type FormaOsposobljavanje = {
  oib: string;
  vrsta: string;
  datum: string;
  vrijediDo: string;
  napomena: string;
};

type CsvImportRow = {
  oib: string;
  vrsta: string;
  datum: string;
  vrijediDo: string;
  napomena: string;
};

const praznaForma: FormaOsposobljavanje = {
  oib: "",
  vrsta: "",
  datum: "",
  vrijediDo: "",
  napomena: "",
};

export default function OsposobljavanjaPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [zapisi, setZapisi] = useState<Osposobljavanje[]>([]);
  const [forma, setForma] = useState<FormaOsposobljavanje>(praznaForma);
  const [editId, setEditId] = useState<string | null>(null);
  const [detalji, setDetalji] = useState<Osposobljavanje | null>(null);

  const [filterRadnik, setFilterRadnik] = useState("");
  const [filterOib, setFilterOib] = useState("");
  const [filterVrsta, setFilterVrsta] = useState("");
  const [filterStatus, setFilterStatus] = useState("svi");

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
    if (!firmaId) return;

    try {
      setGreska("");
      setUcitavanje(true);

      const [tvrtkeRes, radniciRes, zapisiRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/osposobljavanja?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!zapisiRes.ok) throw new Error("Ne mogu učitati osposobljavanja.");

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const zapisiData: Osposobljavanje[] = await zapisiRes.json();

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;
      if (!nadenaTvrtka) {
        throw new Error("Tvrtka nije pronađena.");
      }

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);
      setZapisi(zapisiData);
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

    const matchDots = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/);
    if (matchDots) {
      const [, d, m, y] = matchDots;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    const matchSlashes = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchSlashes) {
      const [, d, m, y] = matchSlashes;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    return "";
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";

    if (value.includes("T")) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const d = String(date.getUTCDate()).padStart(2, "0");
        const m = String(date.getUTCMonth() + 1).padStart(2, "0");
        const y = date.getUTCFullYear();
        return `${d}.${m}.${y}`;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}.${m}.${y}`;
    }

    return value;
  };

  const csvEscape = (value: string | number | boolean | null | undefined) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const exportOsposobljavanjaCsv = () => {
    const headers = [
      "Ime i prezime",
      "OIB",
      "Vrsta osposobljavanja",
      "Datum osposobljavanja",
      "Vrijedi do",
      "Status",
      "Napomena",
    ];

    const rows = filtriranaOsposobljavanja.map((z) => {
      const radnik = radnici.find((r) => r.oib === z.oib);

      return [
        radnik?.ime || "",
        z.oib,
        z.vrsta,
        formatDate(z.datum),
        formatDate(z.vrijediDo),
        statusRoka(z.vrijediDo).text,
        z.napomena || "",
      ];
    });

    const csv = [
      headers.map(csvEscape).join(";"),
      ...rows.map((row) => row.map(csvEscape).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osposobljavanja-${tvrtka?.naziv || "tvrtka"}.csv`;
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
    const idxVrsta = indexOf("vrsta osposobljavanja", "vrsta");
    const idxDatum = indexOf("datum osposobljavanja", "datum");
    const idxVrijediDo = indexOf("vrijedi do");
    const idxNapomena = indexOf("napomena");

    return lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);

      const get = (index: number) => (index >= 0 ? cols[index] ?? "" : "");

      return {
        oib: get(idxOib),
        vrsta: get(idxVrsta),
        datum: get(idxDatum),
        vrijediDo: get(idxVrijediDo),
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

      const res = await fetch("/api/osposobljavanja/import", {
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

  const daysUntil = (value: string | null) => {
    if (!value) return null;

    const iso = parseDate(value) || value;
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

  const upozorenja = useMemo(() => {
    return zapisi.filter((z) => {
      const level = statusRoka(z.vrijediDo).level;
      return level === "expired" || level === "warning";
    });
  }, [zapisi]);

  const filtriranaOsposobljavanja = useMemo(() => {
    return zapisi.filter((z) => {
      const radnik = radnici.find((r) => r.oib === z.oib);
      const status = statusRoka(z.vrijediDo).level;

      const okRadnik =
        !filterRadnik ||
        (radnik?.ime || "").toLowerCase().includes(filterRadnik.toLowerCase());

      const okOib = !filterOib || z.oib.includes(filterOib);

      const okVrsta =
        !filterVrsta ||
        z.vrsta.toLowerCase().includes(filterVrsta.toLowerCase());

      const okStatus =
        filterStatus === "svi" ||
        (filterStatus === "istekli" && status === "expired") ||
        (filterStatus === "uskoro" && status === "warning") ||
        (filterStatus === "vazeci" && status === "ok");

      return okRadnik && okOib && okVrsta && okStatus;
    });
  }, [zapisi, radnici, filterRadnik, filterOib, filterVrsta, filterStatus]);

  const brojUpozorenja = useMemo(() => upozorenja.length, [upozorenja]);

  const brojVazecih = useMemo(
    () =>
      zapisi.filter((z) => statusRoka(z.vrijediDo).level === "ok").length,
    [zapisi]
  );

  const spremi = async () => {
    if (!firmaId) {
      alert("Nedostaje ID tvrtke.");
      return;
    }

    if (!forma.oib || !forma.vrsta || !forma.datum || !forma.vrijediDo) {
      alert("Unesi sve obavezne podatke.");
      return;
    }

    const datum = parseDate(forma.datum);
    const vrijediDo = parseDate(forma.vrijediDo);

    if (!datum) {
      alert("Datum osposobljavanja mora biti u obliku dd.mm.gggg");
      return;
    }

    if (!vrijediDo) {
      alert("Datum vrijedi do mora biti u obliku dd.mm.gggg");
      return;
    }

    const payload = {
      firmaId,
      oib: forma.oib,
      vrsta: forma.vrsta,
      datum,
      vrijediDo,
      napomena: forma.napomena || null,
    };

    try {
      setSpremanje(true);
      setGreska("");

      const res = await fetch(
        editId ? `/api/osposobljavanja/${editId}` : "/api/osposobljavanja",
        {
          method: editId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti osposobljavanje.");
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

  const pokreniUredenje = (zapis: Osposobljavanje) => {
    setForma({
      oib: zapis.oib,
      vrsta: zapis.vrsta,
      datum: formatDate(zapis.datum) === "-" ? "" : formatDate(zapis.datum),
      vrijediDo:
        formatDate(zapis.vrijediDo) === "-" ? "" : formatDate(zapis.vrijediDo),
      napomena: zapis.napomena || "",
    });
    setEditId(zapis.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const odustani = () => {
    setForma(praznaForma);
    setEditId(null);
  };

  const obrisiZapis = async (id: string) => {
    if (!confirm("Obrisati stručno osposobljavanje?")) return;

    try {
      setGreska("");

      const res = await fetch(`/api/osposobljavanja/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati osposobljavanje.");
      }

      if (detalji?.id === id) {
        setDetalji(null);
      }

      if (editId === id) {
        odustani();
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
          <div style={loadingBoxStyle}>Učitavanje...</div>
        </div>
      </div>
    );
  }

  if (!tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={heroCardStyle}>Tvrtka nije pronađena.</div>
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
          <div style={heroTopStyle}>
            <div>
              <div style={heroBadgeStyle}>Modul</div>
              <h1 style={heroTitleStyle}>Stručna osposobljavanja</h1>
              <div style={heroTextStyle}>
                <strong>Tvrtka:</strong> {tvrtka.naziv}
              </div>
            </div>

            <div style={heroInfoCardStyle}>
              <div style={heroInfoLabelStyle}>Ukupno zapisa</div>
              <div style={heroInfoValueStyle}>{zapisi.length}</div>
            </div>
          </div>

          <div style={statsMiniGridStyle}>
            <MiniStat label="Ukupno" value={zapisi.length} />
            <MiniStat label="Važeći" value={brojVazecih} />
            <MiniStat label="Upozorenja" value={brojUpozorenja} alert />
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Uvoz osposobljavanja iz CSV-a</h2>

          <div style={helperTextStyle}>
            CSV treba imati barem stupce:
            <strong> OIB</strong>, <strong>Vrsta osposobljavanja</strong>,
            <strong> Datum osposobljavanja</strong>, <strong>Vrijedi do</strong>.
            Može imati i polje Napomena.
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
          <h2 style={sectionTitleStyle}>Upozorenja</h2>

          {upozorenja.length === 0 ? (
            <div style={okTextStyle}>Nema upozorenja.</div>
          ) : (
            <div style={warningListStyle}>
              {upozorenja.map((z) => {
                const radnik = radnici.find((r) => r.oib === z.oib);
                const status = statusRoka(z.vrijediDo);

                return (
                  <div
                    key={z.id}
                    style={{
                      ...warningItemStyle,
                      ...(status.level === "expired"
                        ? expiredCardStyle
                        : warningCardStyle),
                    }}
                  >
                    <strong>{radnik?.ime || z.oib}</strong> — {z.vrsta} —{" "}
                    {formatDate(z.vrijediDo)} — {status.text}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Filteri i pretraga</h2>

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
                placeholder="Vrsta osposobljavanja"
              />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="svi">Svi</option>
                <option value="istekli">Istekli</option>
                <option value="uskoro">Istječu uskoro</option>
                <option value="vazeci">Važeći</option>
              </select>
            </div>
          </div>

          <div style={actionRowStyle}>
            <button
              style={grayButtonStyle}
              onClick={() => {
                setFilterRadnik("");
                setFilterOib("");
                setFilterVrsta("");
                setFilterStatus("svi");
              }}
            >
              Očisti filtere
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            {editId ? "Uređenje osposobljavanja" : "Unos osposobljavanja"}
          </h2>

          <div style={formGridStyle}>
            <Field label="Radnik">
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
            </Field>

            <Field label="Vrsta osposobljavanja">
              <input
                style={inputStyle}
                value={forma.vrsta}
                onChange={(e) => setForma({ ...forma, vrsta: e.target.value })}
                placeholder="Vrsta osposobljavanja"
              />
            </Field>

            <Field label="Datum osposobljavanja">
              <input
                style={inputStyle}
                value={forma.datum}
                onChange={(e) => setForma({ ...forma, datum: e.target.value })}
                placeholder="dd.mm.gggg"
              />
            </Field>

            <Field label="Vrijedi do">
              <input
                style={inputStyle}
                value={forma.vrijediDo}
                onChange={(e) => setForma({ ...forma, vrijediDo: e.target.value })}
                placeholder="dd.mm.gggg"
              />
            </Field>

            <div style={{ gridColumn: "span 2" }}>
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
            <button
              style={blackButtonStyle}
              onClick={spremi}
              disabled={spremanje}
            >
              {spremanje ? "Spremanje..." : editId ? "Spremi izmjene" : "Dodaj osposobljavanje"}
            </button>

            {editId && (
              <button
                style={grayButtonStyle}
                onClick={odustani}
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
                Popis stručnih osposobljavanja
              </h2>
              <div style={sectionSubtitleStyle}>
                Pregled svih zapisa za ovu tvrtku.
              </div>
            </div>

            <button
              style={grayButtonStyle}
              onClick={exportOsposobljavanjaCsv}
            >
              Izvoz CSV
            </button>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Ime</th>
                  <th style={thStyle}>OIB</th>
                  <th style={thStyle}>Vrsta</th>
                  <th style={thStyle}>Datum</th>
                  <th style={thStyle}>Vrijedi do</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Napomena</th>
                  <th style={thStyle}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filtriranaOsposobljavanja.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={tdCenterStyle}>
                      Nema osposobljavanja za prikaz.
                    </td>
                  </tr>
                ) : (
                  filtriranaOsposobljavanja.map((z) => {
                    const radnik = radnici.find((r) => r.oib === z.oib);
                    const status = statusRoka(z.vrijediDo);

                    return (
                      <tr key={z.id}>
                        <td style={tdStyle}>
                          <div style={{ fontWeight: 700, color: "#111827" }}>
                            {radnik?.ime || "-"}
                          </div>
                        </td>
                        <td style={tdStyle}>{z.oib}</td>
                        <td style={tdStyle}>{z.vrsta}</td>
                        <td style={tdStyle}>{formatDate(z.datum)}</td>
                        <td style={tdStyle}>{formatDate(z.vrijediDo)}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              ...pillStyle,
                              ...statusStyle(z.vrijediDo),
                            }}
                          >
                            {status.text}
                          </span>
                        </td>
                        <td style={tdStyle}>{z.napomena || "-"}</td>
                        <td style={tdStyle}>
                          <div style={tableActionsStyle}>
                            <button
                              style={smallDarkButtonStyle}
                              onClick={() => setDetalji(z)}
                            >
                              Detalji
                            </button>
                            <button
                              style={smallGrayButtonStyle}
                              onClick={() => pokreniUredenje(z)}
                            >
                              Uredi
                            </button>
                            <button
                              style={smallRedButtonStyle}
                              onClick={() => obrisiZapis(z.id)}
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

        {detalji && (
          <div
            onClick={() => setDetalji(null)}
            style={modalOverlayStyle}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={modalCardStyle}
            >
              <div style={modalHeaderStyle}>
                <div>
                  <h2 style={modalTitleStyle}>Detalji osposobljavanja</h2>
                  <div style={modalSubtitleStyle}>
                    {radnici.find((r) => r.oib === detalji.oib)?.ime || detalji.oib}
                  </div>
                </div>
                <button
                  style={smallGrayButtonStyle}
                  onClick={() => setDetalji(null)}
                >
                  Zatvori
                </button>
              </div>

              <div style={detailSectionStyle}>
                <Detalj
                  red="Ime i prezime"
                  value={radnici.find((r) => r.oib === detalji.oib)?.ime || "-"}
                />
                <Detalj red="OIB" value={detalji.oib} />
                <Detalj red="Vrsta" value={detalji.vrsta} />
                <Detalj
                  red="Datum osposobljavanja"
                  value={formatDate(detalji.datum)}
                />
                <Detalj red="Vrijedi do" value={formatDate(detalji.vrijediDo)} />
                <Detalj red="Status" value={statusRoka(detalji.vrijediDo).text} />
                <Detalj red="Napomena" value={detalji.napomena || "-"} />
              </div>
            </div>
          </div>
        )}
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

function Detalj({ red, value }: { red: string; value: string }) {
  return (
    <div style={{ marginBottom: 8, color: "#374151" }}>
      <strong style={{ color: "#111827" }}>{red}:</strong> {value}
    </div>
  );
}

function MiniStat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      style={{
        ...miniStatStyle,
        ...(alert && value > 0
          ? {
              background: "#fffbeb",
              border: "1px solid #fbbf24",
            }
          : {}),
      }}
    >
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

const loadingBoxStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
};

const heroCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 22,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  padding: 28,
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

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 24,
  marginBottom: 24,
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

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
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

const tableActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const warningListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const warningItemStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
};

const expiredCardStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
};

const warningCardStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
  border: "1px solid #fbbf24",
};

const okTextStyle: React.CSSProperties = {
  color: "#166534",
  fontWeight: 600,
};

const errorBoxStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 10,
  borderRadius: 10,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
};

const pillStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  overflowY: "auto",
  zIndex: 50,
};

const modalCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  padding: 24,
  width: "100%",
  maxWidth: 760,
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 18,
  alignItems: "flex-start",
};

const modalTitleStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  margin: 0,
  color: "#111827",
};

const modalSubtitleStyle: React.CSSProperties = {
  color: "#6b7280",
  marginTop: 6,
};

const detailSectionStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};

const blackButtonStyle: React.CSSProperties = {
  width: "100%",
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

const smallDarkButtonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  background: "#111827",
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