"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
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

type Forma = {
  naziv: string;
  tip: string;
  serijskiBroj: string;
  inventarniBroj: string;
  proizvodjac: string;
  model: string;
  datumNabave: string;
  datumServisa: string;
  sljedeciServis: string;
  status: string;
  napomena: string;
};

const praznaForma: Forma = {
  naziv: "",
  tip: "",
  serijskiBroj: "",
  inventarniBroj: "",
  proizvodjac: "",
  model: "",
  datumNabave: "",
  datumServisa: "",
  sljedeciServis: "",
  status: "aktivno",
  napomena: "",
};

export default function RadnaOpremaPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [items, setItems] = useState<RadnaOprema[]>([]);
  const [forma, setForma] = useState<Forma>(praznaForma);
  const [editId, setEditId] = useState<string | null>(null);

  const [filterNaziv, setFilterNaziv] = useState("");
  const [filterTip, setFilterTip] = useState("");
  const [filterStatus, setFilterStatus] = useState("svi");
  const [filterBroj, setFilterBroj] = useState("");

  const [ucitavanje, setUcitavanje] = useState(true);
  const [spremanje, setSpremanje] = useState(false);
  const [importanje, setImportanje] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [greska, setGreska] = useState("");

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  const ucitajSve = async () => {
    try {
      setGreska("");
      setUcitavanje(true);

      const [tvrtkeRes, opremaRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radna-oprema?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!opremaRes.ok) throw new Error("Ne mogu učitati radnu opremu.");

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const opremaData: RadnaOprema[] = await opremaRes.json();

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;
      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronađena.");

      setTvrtka(nadenaTvrtka);
      setItems(opremaData);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const parseDate = (value: string | null) => {
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

  const daysUntil = (value: string | null) => {
    if (!value) return null;

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

  const servisStatus = (value: string | null) => {
    if (!value) return { text: "Nema servisa", level: "none" as const };

    const diff = daysUntil(value);

    if (diff === null) return { text: "Neispravan datum", level: "none" as const };
    if (diff < 0) {
      return {
        text: `Servis istekao prije ${Math.abs(diff)} dana`,
        level: "expired" as const,
      };
    }
    if (diff <= 30) {
      return {
        text: `Servis za ${diff} dana`,
        level: "warning" as const,
      };
    }

    return {
      text: `Servis važi još ${diff} dana`,
      level: "ok" as const,
    };
  };

  const servisStyle = (value: string | null): React.CSSProperties => {
    const s = servisStatus(value);

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
        continue;
      }

      if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    result.push(current.trim());
    return result;
  };

  const readCsvRows = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());

    const indexOf = (...names: string[]) =>
      headers.findIndex((h) => names.includes(h));

    const idxNaziv = indexOf("naziv");
    const idxTip = indexOf("tip");
    const idxSerijskiBroj = indexOf(
      "tvornički broj",
      "tvornicki broj",
      "serijski broj",
      "serijskibroj"
    );
    const idxInventarniBroj = indexOf(
      "inventarni broj",
      "inventarnibroj"
    );
    const idxProizvodjac = indexOf("proizvođač", "proizvodjac");
    const idxModel = indexOf("model");
    const idxDatumNabave = indexOf("datum nabave", "nabava");
    const idxDatumServisa = indexOf("datum servisa", "zadnji servis");
    const idxSljedeciServis = indexOf("sljedeći servis", "sljedeci servis");
    const idxStatus = indexOf("status");
    const idxNapomena = indexOf("napomena");

    return lines.slice(1).map((line) => {
      const cols = parseCsvLine(line);
      const get = (index: number) => (index >= 0 ? cols[index] ?? "" : "");

      return {
        naziv: get(idxNaziv),
        tip: get(idxTip),
        serijskiBroj: get(idxSerijskiBroj),
        inventarniBroj: get(idxInventarniBroj),
        proizvodjac: get(idxProizvodjac),
        model: get(idxModel),
        datumNabave: get(idxDatumNabave),
        datumServisa: get(idxDatumServisa),
        sljedeciServis: get(idxSljedeciServis),
        status: get(idxStatus),
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

      const res = await fetch("/api/radna-oprema/import", {
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

  const filtrirani = useMemo(() => {
    return items.filter((item) => {
      if (
        filterNaziv &&
        !`${item.naziv} ${item.proizvodjac ?? ""} ${item.model ?? ""}`
          .toLowerCase()
          .includes(filterNaziv.toLowerCase())
      ) {
        return false;
      }

      if (filterTip && item.tip !== filterTip) return false;
      if (filterStatus !== "svi" && item.status !== filterStatus) return false;

      if (
        filterBroj &&
        !`${item.serijskiBroj ?? ""} ${item.inventarniBroj ?? ""}`
          .toLowerCase()
          .includes(filterBroj.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [items, filterNaziv, filterTip, filterStatus, filterBroj]);

  const tipovi = useMemo(
    () => Array.from(new Set(items.map((i) => i.tip).filter(Boolean))).sort(),
    [items]
  );

  const ukupno = items.length;
  const aktivno = items.filter((i) => i.status === "aktivno").length;
  const neispravno = items.filter((i) => i.status === "neispravno").length;
  const servisUpozorenja = items.filter((i) => {
    const s = servisStatus(i.sljedeciServis);
    return s.level === "expired" || s.level === "warning";
  }).length;

  const resetForme = () => {
    setForma(praznaForma);
    setEditId(null);
  };

  const spremi = async () => {
    try {
      setGreska("");

      if (!forma.naziv.trim() || !forma.tip.trim()) {
        setGreska("Naziv i tip su obavezni.");
        return;
      }

      setSpremanje(true);

      const payload = {
        firmaId,
        naziv: forma.naziv,
        tip: forma.tip,
        serijskiBroj: forma.serijskiBroj,
        inventarniBroj: forma.inventarniBroj,
        proizvodjac: forma.proizvodjac,
        model: forma.model,
        datumNabave: forma.datumNabave,
        datumServisa: forma.datumServisa,
        sljedeciServis: forma.sljedeciServis,
        status: forma.status,
        napomena: forma.napomena,
      };

      const res = await fetch(
        editId ? `/api/radna-oprema/${editId}` : "/api/radna-oprema",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti zapis.");
      }

      resetForme();
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri spremanju.");
    } finally {
      setSpremanje(false);
    }
  };

  const obrisi = async (id: string) => {
    const potvrda = window.confirm("Obrisati zapis radne opreme?");
    if (!potvrda) return;

    try {
      const res = await fetch(`/api/radna-oprema/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati zapis.");
      }

      if (editId === id) resetForme();
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  };

  const uredi = (item: RadnaOprema) => {
    setEditId(item.id);
    setForma({
      naziv: item.naziv ?? "",
      tip: item.tip ?? "",
      serijskiBroj: item.serijskiBroj ?? "",
      inventarniBroj: item.inventarniBroj ?? "",
      proizvodjac: item.proizvodjac ?? "",
      model: item.model ?? "",
      datumNabave: parseDate(item.datumNabave),
      datumServisa: parseDate(item.datumServisa),
      sljedeciServis: parseDate(item.sljedeciServis),
      status: item.status ?? "aktivno",
      napomena: item.napomena ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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

  if (greska && !tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={heroCardStyle}>
            <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }}>
              Greška
            </h1>
            <p style={{ marginBottom: 16 }}>{greska}</p>
            <Link href="/tvrtke" style={primaryLinkStyle}>
              Natrag na tvrtke
            </Link>
          </div>
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
          <div style={heroTopRowStyle}>
            <div>
              <div style={heroBadgeStyle}>Radna oprema i strojevi</div>
              <h1 style={heroTitleStyle}>{tvrtka?.naziv || "Tvrtka"}</h1>
              <div style={heroMetaStyle}>
                <div>
                  Evidencija strojeva, alata i druge radne opreme po firmi.
                </div>
              </div>
            </div>

            <div style={heroWarningBoxStyle}>
              <div style={heroWarningLabelStyle}>Servisna upozorenja</div>
              <div style={heroWarningValueStyle}>{servisUpozorenja}</div>
            </div>
          </div>

          <div style={heroActionsStyle}>
            <a
              href={`/api/radna-oprema/export?firmaId=${firmaId}`}
              style={secondaryActionStyle}
            >
              CSV export
            </a>

            <a
              href={`/api/ispis/radna-oprema?firmaId=${firmaId}`}
              target="_blank"
              style={primaryActionStyle}
            >
              Ispis
            </a>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatKartica naslov="Ukupno zapisa" vrijednost={ukupno} />
          <StatKartica naslov="Aktivno" vrijednost={aktivno} />
          <StatKartica
            naslov="Neispravno"
            vrijednost={neispravno}
            highlight={neispravno > 0}
          />
          <StatKartica
            naslov="Servis upozorenja"
            vrijednost={servisUpozorenja}
            highlight={servisUpozorenja > 0}
          />
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Uvoz radne opreme iz CSV-a</h2>

          <div style={helperTextStyle}>
            CSV treba imati barem stupce:
            <strong> Naziv</strong> i <strong>Tip</strong>.
            Može imati i <strong>Tvornički broj</strong>,
            <strong> Inventarni broj</strong>,
            <strong> Proizvođač</strong>,
            <strong> Model</strong>,
            <strong> Datum nabave</strong>,
            <strong> Datum servisa</strong>,
            <strong> Sljedeći servis</strong>,
            <strong> Status</strong> i <strong>Napomena</strong>.
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
          <div style={sectionTopStyle}>
            <h2 style={sectionTitleStyle}>
              {editId ? "Uredi zapis" : "Dodaj novi stroj / opremu"}
            </h2>

            {editId ? (
              <button
                type="button"
                onClick={resetForme}
                style={secondaryButtonStyle}
              >
                Odustani od uređivanja
              </button>
            ) : null}
          </div>

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Naziv *</label>
              <input
                value={forma.naziv}
                onChange={(e) =>
                  setForma((prev) => ({ ...prev, naziv: e.target.value }))
                }
                placeholder="npr. Bager CAT 320"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tip *</label>
              <input
                value={forma.tip}
                onChange={(e) =>
                  setForma((prev) => ({ ...prev, tip: e.target.value }))
                }
                placeholder="npr. stroj, alat, vozilo, uređaj"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tvornički broj</label>
              <input
                value={forma.serijskiBroj}
                onChange={(e) =>
                  setForma((prev) => ({
                    ...prev,
                    serijskiBroj: e.target.value,
                  }))
                }
                placeholder="Upiši tvornički broj stroja"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Inventarni broj</label>
              <input
                value={forma.inventarniBroj}
                onChange={(e) =>
                  setForma((prev) => ({
                    ...prev,
                    inventarniBroj: e.target.value,
                  }))
                }
                placeholder="Interni inventarni broj"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Proizvođač</label>
              <input
                value={forma.proizvodjac}
                onChange={(e) =>
                  setForma((prev) => ({
                    ...prev,
                    proizvodjac: e.target.value,
                  }))
                }
                placeholder="npr. Caterpillar"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Model</label>
              <input
                value={forma.model}
                onChange={(e) =>
                  setForma((prev) => ({ ...prev, model: e.target.value }))
                }
                placeholder="npr. 320 GC"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Datum nabave</label>
              <input
                type="date"
                value={forma.datumNabave}
                onChange={(e) =>
                  setForma((prev) => ({
                    ...prev,
                    datumNabave: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Datum zadnjeg servisa</label>
              <input
                type="date"
                value={forma.datumServisa}
                onChange={(e) =>
                  setForma((prev) => ({
                    ...prev,
                    datumServisa: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Sljedeći servis</label>
              <input
                type="date"
                value={forma.sljedeciServis}
                onChange={(e) =>
                  setForma((prev) => ({
                    ...prev,
                    sljedeciServis: e.target.value,
                  }))
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={forma.status}
                onChange={(e) =>
                  setForma((prev) => ({ ...prev, status: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="aktivno">Aktivno</option>
                <option value="neispravno">Neispravno</option>
                <option value="rashodovano">Rashodovano</option>
                <option value="na servisu">Na servisu</option>
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Napomena</label>
              <textarea
                value={forma.napomena}
                onChange={(e) =>
                  setForma((prev) => ({ ...prev, napomena: e.target.value }))
                }
                placeholder="Slobodni unos napomene o stroju, dokumentaciji, lokaciji, kvaru..."
                style={textareaStyle}
              />
            </div>
          </div>

          {greska ? <div style={errorStyle}>{greska}</div> : null}

          <div style={actionsRowStyle}>
            <button
              type="button"
              onClick={spremi}
              disabled={spremanje}
              style={primaryButtonStyle}
            >
              {spremanje
                ? "Spremanje..."
                : editId
                ? "Spremi izmjene"
                : "Dodaj zapis"}
            </button>

            <button
              type="button"
              onClick={resetForme}
              style={secondaryButtonStyle}
            >
              Očisti formu
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Filteri</h2>

          <div style={filtersGridStyle}>
            <div>
              <label style={labelStyle}>Naziv / proizvođač / model</label>
              <input
                value={filterNaziv}
                onChange={(e) => setFilterNaziv(e.target.value)}
                placeholder="Pretraži..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tip</label>
              <select
                value={filterTip}
                onChange={(e) => setFilterTip(e.target.value)}
                style={inputStyle}
              >
                <option value="">Svi tipovi</option>
                {tipovi.map((tip) => (
                  <option key={tip} value={tip}>
                    {tip}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="svi">Svi statusi</option>
                <option value="aktivno">Aktivno</option>
                <option value="neispravno">Neispravno</option>
                <option value="rashodovano">Rashodovano</option>
                <option value="na servisu">Na servisu</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Tvornički / inventarni broj</label>
              <input
                value={filterBroj}
                onChange={(e) => setFilterBroj(e.target.value)}
                placeholder="Pretraži broj..."
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTopStyle}>
            <h2 style={sectionTitleStyle}>
              Popis radne opreme ({filtrirani.length})
            </h2>
          </div>

          {filtrirani.length === 0 ? (
            <div style={emptyStyle}>Nema zapisa za prikaz.</div>
          ) : (
            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Naziv</th>
                    <th style={thStyle}>Tip</th>
                    <th style={thStyle}>Tvornički broj</th>
                    <th style={thStyle}>Inventarni broj</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Sljedeći servis</th>
                    <th style={thStyle}>Napomena</th>
                    <th style={thStyle}>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrirani.map((item) => (
                    <tr key={item.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{item.naziv}</div>
                        <div style={{ color: "#6b7280", fontSize: 13 }}>
                          {[item.proizvodjac, item.model].filter(Boolean).join(" / ") || "-"}
                        </div>
                      </td>

                      <td style={tdStyle}>{item.tip || "-"}</td>
                      <td style={tdStyle}>{item.serijskiBroj || "-"}</td>
                      <td style={tdStyle}>{item.inventarniBroj || "-"}</td>

                      <td style={tdStyle}>
                        <span style={statusPillStyle(item.status)}>
                          {item.status}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ ...servisBadgeBaseStyle, ...servisStyle(item.sljedeciServis) }}>
                          {servisStatus(item.sljedeciServis).text}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        <div style={noteCellStyle}>{item.napomena || "-"}</div>
                      </td>

                      <td style={tdStyle}>
                        <div style={actionsCellStyle}>
                          <button
                            type="button"
                            onClick={() => uredi(item)}
                            style={smallButtonStyle}
                          >
                            Uredi
                          </button>

                          <Link
                            href={`/tvrtke/${firmaId}/radna-oprema/${item.id}`}
                            style={smallLinkStyle}
                          >
                            QR / detalji
                          </Link>

                          <button
                            type="button"
                            onClick={() => obrisi(item.id)}
                            style={dangerButtonStyle}
                          >
                            Obriši
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatKartica({
  naslov,
  vrijednost,
  highlight = false,
}: {
  naslov: string;
  vrijednost: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        ...statCardStyle,
        ...(highlight
          ? {
              border: "1px solid #fbbf24",
              background: "#fffbeb",
            }
          : {}),
      }}
    >
      <div style={statLabelStyle}>{naslov}</div>
      <div style={statValueStyle}>{vrijednost}</div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  background: "#f3f4f6",
  minHeight: "100vh",
  padding: 24,
};

const containerStyle: React.CSSProperties = {
  maxWidth: 1480,
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

const heroTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  alignItems: "flex-start",
  flexWrap: "wrap",
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
  marginBottom: 12,
  color: "#111827",
};

const heroMetaStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#374151",
  fontSize: 15,
};

const heroWarningBoxStyle: React.CSSProperties = {
  minWidth: 180,
  background: "#111827",
  color: "white",
  borderRadius: 18,
  padding: 18,
};

const heroWarningLabelStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.85,
  marginBottom: 8,
};

const heroWarningValueStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  lineHeight: 1,
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 20,
};

const primaryActionStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  background: "#111827",
  color: "white",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
};

const secondaryActionStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  background: "#e5e7eb",
  color: "#111827",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 28,
};

const statCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 18,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 22,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  marginBottom: 10,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  color: "#111827",
  lineHeight: 1.1,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 22,
  marginBottom: 20,
};

const sectionTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  color: "#111827",
};

const helperTextStyle: React.CSSProperties = {
  color: "#4b5563",
  marginBottom: 16,
  lineHeight: 1.6,
};

const uploadGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 14,
  alignItems: "end",
};

const blackButtonStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const filtersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 14,
  outline: "none",
  background: "white",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 90,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 14,
  outline: "none",
  resize: "vertical",
  background: "white",
};

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer",
};

const smallLinkStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#e5e7eb",
  color: "#111827",
  textDecoration: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
  borderRadius: 10,
  padding: "10px 12px",
  fontWeight: 600,
};

const emptyStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 12,
  background: "#f9fafb",
  color: "#6b7280",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 13,
  color: "#6b7280",
  padding: "12px 10px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  fontSize: 14,
  color: "#111827",
};

const noteCellStyle: React.CSSProperties = {
  maxWidth: 260,
  whiteSpace: "pre-wrap",
  color: "#374151",
};

const actionsCellStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const servisBadgeBaseStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
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

function statusPillStyle(status: string): React.CSSProperties {
  if (status === "aktivno") {
    return {
      display: "inline-block",
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #4ade80",
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    };
  }

  if (status === "neispravno") {
    return {
      display: "inline-block",
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #f87171",
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    };
  }

  if (status === "na servisu") {
    return {
      display: "inline-block",
      background: "#dbeafe",
      color: "#1d4ed8",
      border: "1px solid #60a5fa",
      borderRadius: 999,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 700,
      whiteSpace: "nowrap",
    };
  }

  return {
    display: "inline-block",
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
}