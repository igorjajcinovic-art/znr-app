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
};

type RadnoVrijeme = {
  id: string;
  firmaId: string;
  radnikId: string | null;
  oib: string;
  datum: string;
  pocetak: string;
  kraj: string;
  pauzaMin: number;
  ukupnoMin: number;
  status: string;
  napomena: string | null;
};

type Forma = {
  radnikId: string;
  datum: string;
  pocetak: string;
  kraj: string;
  status: string;
  napomena: string;
};

const praznaForma: Forma = {
  radnikId: "",
  datum: "",
  pocetak: "08:00",
  kraj: "16:00",
  status: "evidentirano",
  napomena: "",
};

export default function RadnoVrijemePage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [zapisi, setZapisi] = useState<RadnoVrijeme[]>([]);
  const [forma, setForma] = useState<Forma>(praznaForma);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterRadnik, setFilterRadnik] = useState("");
  const [filterMjesec, setFilterMjesec] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [ucitavanje, setUcitavanje] = useState(true);
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  const ucitajSve = async () => {
    try {
      setUcitavanje(true);
      setGreska("");

      const [tvrtkeRes, radniciRes, vrijemeRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/radno-vrijeme?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!vrijemeRes.ok) {
        throw new Error("Ne mogu učitati evidenciju radnog vremena.");
      }

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const vrijemeData: RadnoVrijeme[] = await vrijemeRes.json();
      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;

      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronađena.");

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);
      setZapisi(vrijemeData);
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

  const radnikPoId = useMemo(
    () => new Map(radnici.map((radnik) => [radnik.id, radnik])),
    [radnici]
  );

  const radnikPoOib = useMemo(
    () => new Map(radnici.map((radnik) => [radnik.oib, radnik])),
    [radnici]
  );

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getUTCDate()).padStart(2, "0")}.${String(
        d.getUTCMonth() + 1
      ).padStart(2, "0")}.${d.getUTCFullYear()}.`;
    }
    return value;
  };

  const toInputDate = (value: string | null) => {
    if (!value) return "";
    if (value.includes("T")) return value.split("T")[0];
    return value;
  };

  const formatMinutes = (minutes: number) => {
    const safe = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  const statusLabel = (status: string) =>
    status === "zakljuceno" ? "Zaključeno" : "Evidentirano";

  const filtriraniZapisi = useMemo(() => {
    return zapisi.filter((zapis) => {
      const radnik =
        (zapis.radnikId ? radnikPoId.get(zapis.radnikId) : null) ||
        radnikPoOib.get(zapis.oib);
      const datumIso = toInputDate(zapis.datum);

      const okRadnik =
        !filterRadnik ||
        (radnik?.ime || zapis.oib)
          .toLowerCase()
          .includes(filterRadnik.toLowerCase()) ||
        zapis.oib.includes(filterRadnik);
      const okMjesec = !filterMjesec || datumIso.startsWith(filterMjesec);
      const okStatus = !filterStatus || zapis.status === filterStatus;

      return okRadnik && okMjesec && okStatus;
    });
  }, [zapisi, radnikPoId, radnikPoOib, filterRadnik, filterMjesec, filterStatus]);

  const ukupnoMinuta = filtriraniZapisi.reduce(
    (sum, zapis) => sum + (zapis.ukupnoMin || 0),
    0
  );
  const ukupnoPrekovremeno = filtriraniZapisi.reduce((sum, zapis) => {
    return sum + Math.max(0, (zapis.ukupnoMin || 0) - 8 * 60);
  }, 0);

  const spremi = async () => {
    if (!firmaId || !forma.radnikId || !forma.datum || !forma.pocetak || !forma.kraj) {
      alert("Odaberi radnika, datum, početak i kraj rada.");
      return;
    }

    try {
      setSpremanje(true);
      setGreska("");

      const res = await fetch(
        editId ? `/api/radno-vrijeme/${editId}` : "/api/radno-vrijeme",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firmaId,
            radnikId: forma.radnikId,
            datum: forma.datum,
            pocetak: forma.pocetak,
            kraj: forma.kraj,
            status: forma.status,
            napomena: forma.napomena.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti radno vrijeme.");
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

  const pokreniUredenje = (zapis: RadnoVrijeme) => {
    const radnik =
      (zapis.radnikId ? radnikPoId.get(zapis.radnikId) : null) ||
      radnikPoOib.get(zapis.oib);

    setForma({
      radnikId: radnik?.id || zapis.radnikId || "",
      datum: toInputDate(zapis.datum),
      pocetak: zapis.pocetak,
      kraj: zapis.kraj,
      status: zapis.status || "evidentirano",
      napomena: zapis.napomena || "",
    });
    setEditId(zapis.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const obrisi = async (id: string) => {
    if (!confirm("Obrisati zapis radnog vremena?")) return;

    try {
      const res = await fetch(`/api/radno-vrijeme/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati zapis.");
      }
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  };

  const csvEscape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const exportHeaders = [
    "Radnik",
    "OIB",
    "Datum",
    "Početak",
    "Kraj",
    "Ukupno",
    "Status",
    "Napomena",
  ];

  const exportRows = () =>
    filtriraniZapisi.map((zapis) => {
      const radnik =
        (zapis.radnikId ? radnikPoId.get(zapis.radnikId) : null) ||
        radnikPoOib.get(zapis.oib);

      return [
        radnik?.ime || "",
        zapis.oib,
        formatDate(zapis.datum),
        zapis.pocetak,
        zapis.kraj,
        formatMinutes(zapis.ukupnoMin),
        statusLabel(zapis.status),
        zapis.napomena || "",
      ];
    });

  const exportCsv = () => {
    const rows = exportRows();
    const csv = [
      exportHeaders.map(csvEscape).join(";"),
      ...rows.map((row) => row.map(csvEscape).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radno-vrijeme-${tvrtka?.naziv || "tvrtka"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = exportRows();
    const worksheet = XLSX.utils.aoa_to_sheet([exportHeaders, ...rows]);
    worksheet["!cols"] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 14 },
      { wch: 32 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Radno vrijeme");
    XLSX.writeFile(
      workbook,
      `radno-vrijeme-${tvrtka?.naziv || "tvrtka"}.xlsx`
    );
  };

  if (ucitavanje) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Učitavanje...</div>
      </div>
    );
  }

  if (!tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Tvrtka nije pronađena.</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/tvrtke/${firmaId}`} style={backLinkStyle}>
          ← Natrag na tvrtku
        </Link>
      </div>

      <section style={heroStyle}>
        <div>
          <div style={badgeStyle}>Modul</div>
          <h1 style={heroTitleStyle}>Evidencija radnog vremena</h1>
          <p style={heroTextStyle}>
            Tvrtka: <strong>{tvrtka.naziv}</strong>
          </p>
        </div>
        <div style={heroStatsStyle}>
          <MiniStat label="Zapisa" value={filtriraniZapisi.length} />
          <MiniStat label="Ukupno sati" value={formatMinutes(ukupnoMinuta)} />
          <MiniStat label="Prekovremeno" value={formatMinutes(ukupnoPrekovremeno)} />
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>
          {editId ? "Uređenje zapisa" : "Unos radnog vremena"}
        </h2>

        <div style={formGridStyle}>
          <Field label="Radnik">
            <select
              style={inputStyle}
              value={forma.radnikId}
              onChange={(e) => setForma({ ...forma, radnikId: e.target.value })}
            >
              <option value="">Odaberi radnika</option>
              {aktivniRadnici.map((radnik) => (
                <option key={radnik.id} value={radnik.id}>
                  {radnik.ime} ({radnik.oib})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Datum">
            <input
              type="date"
              style={inputStyle}
              value={forma.datum}
              onChange={(e) => setForma({ ...forma, datum: e.target.value })}
            />
          </Field>

          <Field label="Početak rada">
            <input
              type="time"
              style={inputStyle}
              value={forma.pocetak}
              onChange={(e) => setForma({ ...forma, pocetak: e.target.value })}
            />
          </Field>

          <Field label="Kraj rada">
            <input
              type="time"
              style={inputStyle}
              value={forma.kraj}
              onChange={(e) => setForma({ ...forma, kraj: e.target.value })}
            />
          </Field>

          <Field label="Status">
            <select
              style={inputStyle}
              value={forma.status}
              onChange={(e) => setForma({ ...forma, status: e.target.value })}
            >
              <option value="evidentirano">Evidentirano</option>
              <option value="zakljuceno">Zaključeno</option>
            </select>
          </Field>

          <Field label="Napomena">
            <input
              style={inputStyle}
              value={forma.napomena}
              onChange={(e) => setForma({ ...forma, napomena: e.target.value })}
              placeholder="Napomena"
            />
          </Field>
        </div>

        <div style={actionRowStyle}>
          <button style={primaryButtonStyle} onClick={spremi} disabled={spremanje}>
            {spremanje ? "Spremanje..." : editId ? "Spremi izmjene" : "Dodaj zapis"}
          </button>
          {editId ? (
            <button
              style={secondaryButtonStyle}
              onClick={() => {
                setForma(praznaForma);
                setEditId(null);
              }}
            >
              Odustani
            </button>
          ) : null}
        </div>

        {greska ? <div style={errorStyle}>{greska}</div> : null}
      </section>

      <section style={cardStyle}>
        <div style={tableHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Popis radnog vremena</h2>
            <p style={mutedStyle}>Pregled zapisa po radniku, datumu i statusu.</p>
          </div>
          <div style={exportActionsStyle}>
            <button style={secondaryButtonStyle} onClick={exportCsv}>
              Izvoz CSV
            </button>
            <button style={primaryButtonStyle} onClick={exportExcel}>
              Izvoz Excel
            </button>
          </div>
        </div>

        <div style={filterGridStyle}>
          <Field label="Radnik">
            <input
              style={inputStyle}
              value={filterRadnik}
              onChange={(e) => setFilterRadnik(e.target.value)}
              placeholder="Ime ili OIB"
            />
          </Field>
          <Field label="Mjesec">
            <input
              type="month"
              style={inputStyle}
              value={filterMjesec}
              onChange={(e) => setFilterMjesec(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              style={inputStyle}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Svi statusi</option>
              <option value="evidentirano">Evidentirano</option>
              <option value="zakljuceno">Zaključeno</option>
            </select>
          </Field>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Radnik</th>
                <th style={thStyle}>Datum</th>
                <th style={thStyle}>Vrijeme</th>
                <th style={thStyle}>Ukupno</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Napomena</th>
                <th style={thStyle}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtriraniZapisi.length === 0 ? (
                <tr>
                  <td style={tdCenterStyle} colSpan={7}>
                    Nema zapisa.
                  </td>
                </tr>
              ) : (
                filtriraniZapisi.map((zapis) => {
                  const radnik =
                    (zapis.radnikId ? radnikPoId.get(zapis.radnikId) : null) ||
                    radnikPoOib.get(zapis.oib);

                  return (
                    <tr key={zapis.id}>
                      <td style={tdStyle}>
                        <strong>{radnik?.ime || zapis.oib}</strong>
                        <div style={subTextStyle}>{zapis.oib}</div>
                      </td>
                      <td style={tdStyle}>{formatDate(zapis.datum)}</td>
                      <td style={tdStyle}>
                        {zapis.pocetak} - {zapis.kraj}
                      </td>
                      <td style={tdStyle}>
                        <strong>{formatMinutes(zapis.ukupnoMin)}</strong>
                      </td>
                      <td style={tdStyle}>
                        <span style={pillStyle}>{statusLabel(zapis.status)}</span>
                      </td>
                      <td style={tdStyle}>{zapis.napomena || "-"}</td>
                      <td style={tdStyle}>
                        <div style={tableActionsStyle}>
                          <button
                            style={smallButtonStyle}
                            onClick={() => pokreniUredenje(zapis)}
                          >
                            Uredi
                          </button>
                          <button
                            style={smallDangerButtonStyle}
                            onClick={() => obrisi(zapis.id)}
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
      </section>
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
    <label style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={miniStatStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const backLinkStyle: React.CSSProperties = {
  color: "#0f766e",
  textDecoration: "none",
  fontWeight: 900,
};

const heroStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 18,
  alignItems: "center",
  padding: 22,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
};

const badgeStyle: React.CSSProperties = {
  color: "#0f766e",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const heroTitleStyle: React.CSSProperties = {
  margin: "5px 0 7px",
  fontSize: 32,
  color: "#0f172a",
};

const heroTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const heroStatsStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
  gap: 10,
};

const miniStatStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  borderRadius: 8,
  background: "#f8fafc",
  color: "#334155",
  fontWeight: 800,
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 18,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 20,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
  marginBottom: 18,
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "10px 11px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
  fontSize: 14,
  background: "white",
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#111827",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#e2e8f0",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 8,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const exportActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 980,
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
};

const tdCenterStyle: React.CSSProperties = {
  padding: 18,
  textAlign: "center",
  color: "#64748b",
};

const subTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 12,
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  fontSize: 12,
  fontWeight: 900,
};

const tableActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "7px 9px",
  borderRadius: 8,
  border: "none",
  background: "#64748b",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const smallDangerButtonStyle: React.CSSProperties = {
  padding: "7px 9px",
  borderRadius: 8,
  border: "none",
  background: "#dc2626",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
