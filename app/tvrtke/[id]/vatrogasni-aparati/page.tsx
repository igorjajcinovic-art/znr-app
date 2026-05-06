"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
};

type Aparat = {
  id: string;
  firmaId: string;
  oznaka: string;
  lokacija: string;
  vrsta: string | null;
  proizvodjac: string | null;
  tvornickiBroj: string | null;
  datumRedovnogPregleda: string | null;
  sljedeciRedovniPregled: string | null;
  datumPeriodicnogPregleda: string | null;
  sljedeciPeriodicniPregled: string | null;
  status: string;
  napomena: string | null;
};

type Pregled = {
  id: string;
  aparatId: string;
  vrstaPregleda: string;
  datumPregleda: string;
  sljedeciPregled: string | null;
  napomena: string | null;
};

type Forma = {
  oznaka: string;
  lokacija: string;
  vrsta: string;
  proizvodjac: string;
  tvornickiBroj: string;
  datumRedovnogPregleda: string;
  sljedeciRedovniPregled: string;
  datumPeriodicnogPregleda: string;
  sljedeciPeriodicniPregled: string;
  status: string;
  napomena: string;
};

const praznaForma: Forma = {
  oznaka: "",
  lokacija: "",
  vrsta: "",
  proizvodjac: "",
  tvornickiBroj: "",
  datumRedovnogPregleda: "",
  sljedeciRedovniPregled: "",
  datumPeriodicnogPregleda: "",
  sljedeciPeriodicniPregled: "",
  status: "aktivno",
  napomena: "",
};

function parseInputDate(value: string | null) {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

function formatDate(value: string | null) {
  const iso = parseInputDate(value);
  if (!iso) return "-";

  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}.`;
}

function daysUntil(value: string | null) {
  const iso = parseInputDate(value);
  if (!iso) return null;

  const [y, m, d] = iso.split("-");
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

  return Math.ceil((targetOnly.getTime() - todayOnly.getTime()) / 86400000);
}

function rokStatus(value: string | null) {
  const diff = daysUntil(value);

  if (diff === null) return { text: "Nema roka", level: "none" as const };
  if (diff < 0) {
    return {
      text: `Isteklo prije ${Math.abs(diff)} dana`,
      level: "expired" as const,
    };
  }
  if (diff <= 30) {
    return { text: `Istječe za ${diff} dana`, level: "warning" as const };
  }

  return { text: `Važi još ${diff} dana`, level: "ok" as const };
}

function badgeStyle(value: string | null): React.CSSProperties {
  const status = rokStatus(value);

  if (status.level === "expired") {
    return { ...badgeBaseStyle, background: "#fee2e2", color: "#991b1b" };
  }

  if (status.level === "warning") {
    return { ...badgeBaseStyle, background: "#fef3c7", color: "#92400e" };
  }

  if (status.level === "ok") {
    return { ...badgeBaseStyle, background: "#dcfce7", color: "#166534" };
  }

  return { ...badgeBaseStyle, background: "#e2e8f0", color: "#475569" };
}

function vrstaPregledaLabel(value: string) {
  return value === "periodicni" ? "Periodički" : "Redovni";
}

export default function VatrogasniAparatiPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [aparati, setAparati] = useState<Aparat[]>([]);
  const [forma, setForma] = useState<Forma>(praznaForma);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterStatus, setFilterStatus] = useState("svi");
  const [otvorenaPovijest, setOtvorenaPovijest] = useState<string | null>(null);
  const [preglediPoAparatu, setPreglediPoAparatu] = useState<
    Record<string, Pregled[]>
  >({});
  const [ucitavanjePovijesti, setUcitavanjePovijesti] = useState<string | null>(
    null
  );
  const [ucitavanje, setUcitavanje] = useState(true);
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  const ucitajSve = async () => {
    try {
      setGreska("");
      setUcitavanje(true);

      const [tvrtkeRes, aparatiRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/vatrogasni-aparati?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!aparatiRes.ok) {
        throw new Error("Ne mogu učitati vatrogasne aparate.");
      }

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const data: Aparat[] = await aparatiRes.json();

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;
      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronađena.");

      setTvrtka(nadenaTvrtka);
      setAparati(data);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const filtriraniAparati = useMemo(() => {
    const q = filter.trim().toLowerCase();

    return aparati.filter((aparat) => {
      const text = [
        aparat.oznaka,
        aparat.lokacija,
        aparat.vrsta,
        aparat.proizvodjac,
        aparat.tvornickiBroj,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const redovni = rokStatus(aparat.sljedeciRedovniPregled).level;
      const periodicni = rokStatus(aparat.sljedeciPeriodicniPregled).level;

      const okStatus =
        filterStatus === "svi" ||
        (filterStatus === "upozorenja" &&
          (redovni === "expired" ||
            redovni === "warning" ||
            periodicni === "expired" ||
            periodicni === "warning")) ||
        aparat.status === filterStatus;

      return (!q || text.includes(q)) && okStatus;
    });
  }, [aparati, filter, filterStatus]);

  const brojUpozorenja = useMemo(
    () =>
      aparati.filter((aparat) => {
        const redovni = rokStatus(aparat.sljedeciRedovniPregled).level;
        const periodicni = rokStatus(aparat.sljedeciPeriodicniPregled).level;
        return (
          redovni === "expired" ||
          redovni === "warning" ||
          periodicni === "expired" ||
          periodicni === "warning"
        );
      }).length,
    [aparati]
  );

  const spremi = async () => {
    if (!forma.oznaka.trim() || !forma.lokacija.trim()) {
      alert("Unesi oznaku i lokaciju aparata.");
      return;
    }

    try {
      setSpremanje(true);
      setGreska("");

      const res = await fetch(
        editId
          ? `/api/vatrogasni-aparati/${editId}`
          : "/api/vatrogasni-aparati",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...forma,
            firmaId,
            vrsta: forma.vrsta.trim() || null,
            proizvodjac: forma.proizvodjac.trim() || null,
            tvornickiBroj: forma.tvornickiBroj.trim() || null,
            napomena: forma.napomena.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti aparat.");
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

  const uredi = (aparat: Aparat) => {
    setEditId(aparat.id);
    setForma({
      oznaka: aparat.oznaka,
      lokacija: aparat.lokacija,
      vrsta: aparat.vrsta || "",
      proizvodjac: aparat.proizvodjac || "",
      tvornickiBroj: aparat.tvornickiBroj || "",
      datumRedovnogPregleda: parseInputDate(aparat.datumRedovnogPregleda),
      sljedeciRedovniPregled: parseInputDate(aparat.sljedeciRedovniPregled),
      datumPeriodicnogPregleda: parseInputDate(
        aparat.datumPeriodicnogPregleda
      ),
      sljedeciPeriodicniPregled: parseInputDate(
        aparat.sljedeciPeriodicniPregled
      ),
      status: aparat.status,
      napomena: aparat.napomena || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const obrisi = async (id: string) => {
    if (!confirm("Obrisati vatrogasni aparat?")) return;

    try {
      const res = await fetch(`/api/vatrogasni-aparati/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati aparat.");
      }

      if (editId === id) {
        setEditId(null);
        setForma(praznaForma);
      }

      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  };

  const evidentirajPregled = async (
    aparat: Aparat,
    vrstaPregleda: "redovni" | "periodicni"
  ) => {
    const danas = new Date().toISOString().split("T")[0];
    const label =
      vrstaPregleda === "redovni" ? "redovni pregled" : "periodički pregled";
    const datumPregleda = prompt(
      `Unesi datum za ${label} aparata ${aparat.oznaka}:`,
      danas
    );

    if (!datumPregleda) return;

    try {
      setGreska("");

      const res = await fetch(
        `/api/vatrogasni-aparati/${aparat.id}/pregledi`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vrstaPregleda, datumPregleda }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu evidentirati pregled.");
      }

      await ucitajSve();
      setPreglediPoAparatu((prev) => {
        const next = { ...prev };
        delete next[aparat.id];
        return next;
      });
      if (otvorenaPovijest === aparat.id) {
        await ucitajPovijest(aparat.id, true);
      }
    } catch (err) {
      setGreska(
        err instanceof Error ? err.message : "Greška pri evidentiranju pregleda."
      );
    }
  };

  const ucitajPovijest = async (aparatId: string, force = false) => {
    if (!force && preglediPoAparatu[aparatId]) return;

    try {
      setUcitavanjePovijesti(aparatId);
      setGreska("");

      const res = await fetch(`/api/vatrogasni-aparati/${aparatId}/pregledi`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu učitati povijest pregleda.");
      }

      const data: Pregled[] = await res.json();
      setPreglediPoAparatu((prev) => ({ ...prev, [aparatId]: data }));
    } catch (err) {
      setGreska(
        err instanceof Error ? err.message : "Greška pri učitavanju povijesti."
      );
    } finally {
      setUcitavanjePovijesti(null);
    }
  };

  const togglePovijest = async (aparatId: string) => {
    if (otvorenaPovijest === aparatId) {
      setOtvorenaPovijest(null);
      return;
    }

    setOtvorenaPovijest(aparatId);
    await ucitajPovijest(aparatId);
  };

  if (ucitavanje) {
    return <div style={panelStyle}>Učitavanje...</div>;
  }

  return (
    <div style={pageStyle}>
      <div>
        <Link href={`/tvrtke/${firmaId}`} style={backLinkStyle}>
          ← Natrag na tvrtku
        </Link>
      </div>

      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Vatrogasni aparati</div>
          <h1 style={titleStyle}>{tvrtka?.naziv || "Tvrtka"}</h1>
          <p style={subtitleStyle}>
            Evidencija aparata s redovnim tromjesečnim i periodičkim godišnjim
            pregledima.
          </p>
        </div>

        <div style={heroStatsStyle}>
          <div style={heroStatStyle}>
            <span>Ukupno</span>
            <strong>{aparati.length}</strong>
          </div>
          <div style={heroStatStyle}>
            <span>Upozorenja</span>
            <strong>{brojUpozorenja}</strong>
          </div>
          <a
            href={`/api/ispis/vatrogasni-aparati?firmaId=${firmaId}`}
            target="_blank"
            rel="noreferrer"
            style={printLinkStyle}
          >
            Upisnik
          </a>
        </div>
      </section>

      {greska ? <div style={errorStyle}>{greska}</div> : null}

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>
          {editId ? "Uredi aparat" : "Dodaj vatrogasni aparat"}
        </h2>

        <div style={formGridStyle}>
          <Field label="Oznaka *">
            <input
              style={inputStyle}
              value={forma.oznaka}
              onChange={(e) => setForma({ ...forma, oznaka: e.target.value })}
              placeholder="npr. VA-001"
            />
          </Field>

          <Field label="Lokacija *">
            <input
              style={inputStyle}
              value={forma.lokacija}
              onChange={(e) => setForma({ ...forma, lokacija: e.target.value })}
              placeholder="npr. Skladište, ulaz, ured"
            />
          </Field>

          <Field label="Vrsta">
            <input
              style={inputStyle}
              value={forma.vrsta}
              onChange={(e) => setForma({ ...forma, vrsta: e.target.value })}
              placeholder="npr. S6, CO2, P50"
            />
          </Field>

          <Field label="Proizvođač">
            <input
              style={inputStyle}
              value={forma.proizvodjac}
              onChange={(e) =>
                setForma({ ...forma, proizvodjac: e.target.value })
              }
            />
          </Field>

          <Field label="Tvornički broj">
            <input
              style={inputStyle}
              value={forma.tvornickiBroj}
              onChange={(e) =>
                setForma({ ...forma, tvornickiBroj: e.target.value })
              }
            />
          </Field>

          <Field label="Datum redovnog pregleda">
            <input
              type="date"
              style={inputStyle}
              value={forma.datumRedovnogPregleda}
              onChange={(e) =>
                setForma({
                  ...forma,
                  datumRedovnogPregleda: e.target.value,
                  sljedeciRedovniPregled: "",
                })
              }
            />
          </Field>

          <Field label="Sljedeći redovni pregled">
            <input
              type="date"
              style={inputStyle}
              value={forma.sljedeciRedovniPregled}
              onChange={(e) =>
                setForma({ ...forma, sljedeciRedovniPregled: e.target.value })
              }
            />
          </Field>

          <Field label="Datum periodičkog pregleda">
            <input
              type="date"
              style={inputStyle}
              value={forma.datumPeriodicnogPregleda}
              onChange={(e) =>
                setForma({
                  ...forma,
                  datumPeriodicnogPregleda: e.target.value,
                  sljedeciPeriodicniPregled: "",
                })
              }
            />
          </Field>

          <Field label="Sljedeći periodički pregled">
            <input
              type="date"
              style={inputStyle}
              value={forma.sljedeciPeriodicniPregled}
              onChange={(e) =>
                setForma({
                  ...forma,
                  sljedeciPeriodicniPregled: e.target.value,
                })
              }
            />
          </Field>

          <Field label="Status">
            <select
              style={inputStyle}
              value={forma.status}
              onChange={(e) => setForma({ ...forma, status: e.target.value })}
            >
              <option value="aktivno">Aktivno</option>
              <option value="neaktivno">Neaktivno</option>
              <option value="servis">Na servisu</option>
              <option value="otpisano">Otpisano</option>
            </select>
          </Field>

          <Field label="Napomena">
            <textarea
              style={{ ...inputStyle, minHeight: 84, resize: "vertical" }}
              value={forma.napomena}
              onChange={(e) => setForma({ ...forma, napomena: e.target.value })}
            />
          </Field>
        </div>

        <div style={actionsStyle}>
          <button type="button" style={primaryButtonStyle} onClick={spremi}>
            {spremanje ? "Spremanje..." : editId ? "Spremi izmjene" : "Dodaj aparat"}
          </button>
          {editId ? (
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => {
                setEditId(null);
                setForma(praznaForma);
              }}
            >
              Odustani
            </button>
          ) : null}
        </div>
      </section>

      <section style={panelStyle}>
        <div style={filterRowStyle}>
          <input
            style={inputStyle}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Pretraži oznaku, lokaciju, vrstu, broj..."
          />
          <select
            style={inputStyle}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="svi">Svi zapisi</option>
            <option value="upozorenja">Samo upozorenja</option>
            <option value="aktivno">Aktivno</option>
            <option value="neaktivno">Neaktivno</option>
            <option value="servis">Na servisu</option>
            <option value="otpisano">Otpisano</option>
          </select>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Oznaka</th>
                <th style={thStyle}>Lokacija</th>
                <th style={thStyle}>Vrsta</th>
                <th style={thStyle}>Redovni pregled</th>
                <th style={thStyle}>Periodički pregled</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Akcije</th>
              </tr>
            </thead>
            <tbody>
              {filtriraniAparati.length === 0 ? (
                <tr>
                  <td style={tdStyle} colSpan={7}>
                    Nema vatrogasnih aparata za prikaz.
                  </td>
                </tr>
              ) : (
                filtriraniAparati.map((aparat) => {
                  const povijestOtvorena = otvorenaPovijest === aparat.id;
                  const pregledi = preglediPoAparatu[aparat.id] || [];

                  return (
                    <Fragment key={aparat.id}>
                      <tr>
                        <td style={tdStyle}>
                          <strong>{aparat.oznaka}</strong>
                          <div style={mutedStyle}>
                            {aparat.tvornickiBroj || "-"}
                          </div>
                        </td>
                        <td style={tdStyle}>{aparat.lokacija}</td>
                        <td style={tdStyle}>{aparat.vrsta || "-"}</td>
                        <td style={tdStyle}>
                          <div>{formatDate(aparat.sljedeciRedovniPregled)}</div>
                          <span
                            style={badgeStyle(aparat.sljedeciRedovniPregled)}
                          >
                            {rokStatus(aparat.sljedeciRedovniPregled).text}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div>
                            {formatDate(aparat.sljedeciPeriodicniPregled)}
                          </div>
                          <span
                            style={badgeStyle(
                              aparat.sljedeciPeriodicniPregled
                            )}
                          >
                            {rokStatus(aparat.sljedeciPeriodicniPregled).text}
                          </span>
                        </td>
                        <td style={tdStyle}>{aparat.status}</td>
                        <td style={tdStyle}>
                          <button
                            type="button"
                            style={smallButtonStyle}
                            onClick={() =>
                              evidentirajPregled(aparat, "redovni")
                            }
                          >
                            Redovni
                          </button>
                          <button
                            type="button"
                            style={smallButtonStyle}
                            onClick={() =>
                              evidentirajPregled(aparat, "periodicni")
                            }
                          >
                            Periodički
                          </button>
                          <button
                            type="button"
                            style={smallButtonStyle}
                            onClick={() => togglePovijest(aparat.id)}
                          >
                            {povijestOtvorena ? "Sakrij" : "Povijest"}
                          </button>
                          <button
                            type="button"
                            style={smallButtonStyle}
                            onClick={() => uredi(aparat)}
                          >
                            Uredi
                          </button>
                          <button
                            type="button"
                            style={dangerButtonStyle}
                            onClick={() => obrisi(aparat.id)}
                          >
                            Obriši
                          </button>
                        </td>
                      </tr>
                      {povijestOtvorena ? (
                        <tr>
                          <td style={historyCellStyle} colSpan={7}>
                            {ucitavanjePovijesti === aparat.id ? (
                              <div style={mutedStyle}>Učitavanje povijesti...</div>
                            ) : pregledi.length === 0 ? (
                              <div style={mutedStyle}>
                                Još nema evidentiranih pregleda za ovaj aparat.
                              </div>
                            ) : (
                              <div style={historyListStyle}>
                                {pregledi.map((pregled) => (
                                  <div key={pregled.id} style={historyItemStyle}>
                                    <strong>
                                      {vrstaPregledaLabel(
                                        pregled.vrstaPregleda
                                      )}
                                    </strong>
                                    <span>
                                      Datum pregleda:{" "}
                                      {formatDate(pregled.datumPregleda)}
                                    </span>
                                    <span>
                                      Sljedeći rok:{" "}
                                      {formatDate(pregled.sljedeciPregled)}
                                    </span>
                                    {pregled.napomena ? (
                                      <span>{pregled.napomena}</span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};

const heroStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  padding: 22,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#b45309",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "6px 0 8px",
  color: "#0f172a",
  fontSize: 30,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const heroStatsStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const heroStatStyle: React.CSSProperties = {
  minWidth: 120,
  padding: 14,
  borderRadius: 8,
  background: "#f8fafc",
  display: "grid",
  gap: 6,
};

const printLinkStyle: React.CSSProperties = {
  minWidth: 120,
  padding: "14px 16px",
  borderRadius: 8,
  background: "#0f2747",
  color: "white",
  textDecoration: "none",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panelStyle: React.CSSProperties = {
  padding: 18,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  color: "#0f172a",
  fontSize: 20,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: 14,
};

const fieldStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  background: "#ffffff",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "11px 15px",
  borderRadius: 8,
  border: "none",
  background: "#0f2747",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "11px 15px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const filterRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(190px, 260px)",
  gap: 12,
  marginBottom: 14,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 920,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  borderBottom: "1px solid #cbd5e1",
  color: "#475569",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #eef2f7",
  verticalAlign: "top",
};

const badgeBaseStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: 6,
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
};

const mutedStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
};

const historyCellStyle: React.CSSProperties = {
  padding: 14,
  borderBottom: "1px solid #eef2f7",
  background: "#f8fafc",
};

const historyListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const historyItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "140px 1fr 1fr",
  gap: 12,
  alignItems: "center",
  padding: 10,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  fontSize: 13,
};

const smallButtonStyle: React.CSSProperties = {
  marginRight: 8,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "none",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 900,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 800,
};
