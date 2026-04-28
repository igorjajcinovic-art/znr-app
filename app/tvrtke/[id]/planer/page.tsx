"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import hrLocale from "@fullcalendar/core/locales/hr";
import type { EventClickArg } from "@fullcalendar/core";

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

type RadnaOprema = {
  id: string;
  firmaId: string;
  naziv: string;
  tip: string;
  serijskiBroj: string | null;
  inventarniBroj: string | null;
  status: string;
};

type PlanerItem = {
  id: string;
  firmaId: string;
  naziv: string;
  opis: string | null;
  datum: string;
  tip: string;
  status: string;
  radnikId: string | null;
  opremaId: string | null;
};

type Forma = {
  naziv: string;
  opis: string;
  datum: string;
  tip: string;
  status: string;
  radnikId: string;
  opremaId: string;
};

const praznaForma: Forma = {
  naziv: "",
  opis: "",
  datum: "",
  tip: "ostalo",
  status: "planirano",
  radnikId: "",
  opremaId: "",
};

export default function PlanerPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [items, setItems] = useState<PlanerItem[]>([]);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [strojevi, setStrojevi] = useState<RadnaOprema[]>([]);
  const [forma, setForma] = useState<Forma>(praznaForma);
  const [brzaForma, setBrzaForma] = useState<Forma>(praznaForma);
  const [editForma, setEditForma] = useState<Forma>(praznaForma);

  const [editId, setEditId] = useState<string | null>(null);
  const [modalEditId, setModalEditId] = useState<string | null>(null);
  const [odabraniId, setOdabraniId] = useState<string | null>(null);
  const [prikaz, setPrikaz] = useState<"kalendar" | "lista">("kalendar");
  const [odabraniDatum, setOdabraniDatum] = useState<string>("");

  const [searchNaziv, setSearchNaziv] = useState("");
  const [filterTip, setFilterTip] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterVeza, setFilterVeza] = useState("");

  const [showQuickModal, setShowQuickModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [greska, setGreska] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [editModalSaving, setEditModalSaving] = useState(false);

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  const ucitajSve = async () => {
    try {
      setLoading(true);
      setGreska("");

      const [tvrtkeRes, planerRes, radniciRes, strojeviRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/planer?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/radna-oprema?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!planerRes.ok) throw new Error("Ne mogu učitati planer.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!strojeviRes.ok) throw new Error("Ne mogu učitati strojeve.");

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const planerData: PlanerItem[] = await planerRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const strojeviData: RadnaOprema[] = await strojeviRes.json();

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;
      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronađena.");

      setTvrtka(nadenaTvrtka);
      setItems(planerData);
      setRadnici(radniciData);
      setStrojevi(strojeviData);

      if (planerData.length > 0 && !odabraniId) {
        setOdabraniId(planerData[0].id);
      }
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string) => {
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

  const parseDate = (value: string) => {
    if (!value) return "";
    if (value.includes("T")) return value.split("T")[0];
    return value;
  };

  const daysUntil = (value: string) => {
    const iso = parseDate(value);
    if (!iso) return null;

    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return null;

    const target = new Date(Number(y), Number(m) - 1, Number(d));
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

  const autoStatus = (item: { datum: string; status: string }) => {
    if (item.status === "izvrseno") return "izvrseno";

    const diff = daysUntil(item.datum);
    if (diff !== null && diff < 0) return "kasni";

    return "planirano";
  };

  const nazivRadnika = (radnikId: string | null) => {
    if (!radnikId) return "-";
    const radnik = radnici.find((r) => r.id === radnikId);
    return radnik ? radnik.ime : "-";
  };

  const nazivStroja = (opremaId: string | null) => {
    if (!opremaId) return "-";
    const stroj = strojevi.find((s) => s.id === opremaId);
    if (!stroj) return "-";

    const dodatak = stroj.serijskiBroj || stroj.inventarniBroj;
    return dodatak ? `${stroj.naziv} (${dodatak})` : stroj.naziv;
  };

  const statusBoja = (item: PlanerItem): React.CSSProperties => {
    const stvarniStatus = autoStatus(item);
    const diff = daysUntil(item.datum);

    if (stvarniStatus === "izvrseno") {
      return {
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #4ade80",
      };
    }

    if (stvarniStatus === "kasni") {
      return {
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #f87171",
      };
    }

    if (diff !== null && diff <= 7) {
      return {
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #fbbf24",
      };
    }

    return {
      background: "#e5e7eb",
      color: "#111827",
      border: "1px solid #d1d5db",
    };
  };

  const bojaEventa = (item: PlanerItem) => {
    const stvarniStatus = autoStatus(item);

    if (stvarniStatus === "izvrseno") {
      return {
        backgroundColor: "#dcfce7",
        borderColor: "#4ade80",
        textColor: "#166534",
      };
    }

    if (stvarniStatus === "kasni") {
      return {
        backgroundColor: "#fee2e2",
        borderColor: "#f87171",
        textColor: "#991b1b",
      };
    }

    if (item.tip === "lijecnicki") {
      return {
        backgroundColor: "#dbeafe",
        borderColor: "#60a5fa",
        textColor: "#1d4ed8",
      };
    }

    if (item.tip === "servis") {
      return {
        backgroundColor: "#fef3c7",
        borderColor: "#fbbf24",
        textColor: "#92400e",
      };
    }

    if (item.tip === "ispitivanje") {
      return {
        backgroundColor: "#ede9fe",
        borderColor: "#a78bfa",
        textColor: "#6d28d9",
      };
    }

    if (item.tip === "osposobljavanje") {
      return {
        backgroundColor: "#dcfce7",
        borderColor: "#4ade80",
        textColor: "#166534",
      };
    }

    return {
      backgroundColor: "#e5e7eb",
      borderColor: "#d1d5db",
      textColor: "#111827",
    };
  };

  const filtrirani = useMemo(() => {
    const search = searchNaziv.trim().toLowerCase();

    return items.filter((item) => {
      const stvarniStatus = autoStatus(item);

      if (search) {
        const naziv = item.naziv.toLowerCase();
        const opis = (item.opis || "").toLowerCase();
        const radnikNaziv = nazivRadnika(item.radnikId).toLowerCase();
        const strojNaziv = nazivStroja(item.opremaId).toLowerCase();

        const matchSearch =
          naziv.includes(search) ||
          opis.includes(search) ||
          radnikNaziv.includes(search) ||
          strojNaziv.includes(search);

        if (!matchSearch) return false;
      }

      if (filterTip && item.tip !== filterTip) return false;
      if (filterStatus && stvarniStatus !== filterStatus) return false;

      if (filterVeza === "radnik" && !item.radnikId) return false;
      if (filterVeza === "stroj" && !item.opremaId) return false;
      if (filterVeza === "bez-veze" && (item.radnikId || item.opremaId))
        return false;

      return true;
    });
  }, [items, searchNaziv, filterTip, filterStatus, filterVeza, radnici, strojevi]);

  const kalendarEventi = useMemo(() => {
    return filtrirani.map((item) => {
      const boja = bojaEventa(item);

      return {
        id: item.id,
        title: item.naziv,
        date: parseDate(item.datum),
        backgroundColor: boja.backgroundColor,
        borderColor: boja.borderColor,
        textColor: boja.textColor,
      };
    });
  }, [filtrirani]);

  const odabraniItem = useMemo(
    () => items.find((i) => i.id === odabraniId) || null,
    [items, odabraniId]
  );

  const brojUkupno = filtrirani.length;
  const brojPlanirano = filtrirani.filter(
    (i) => autoStatus(i) === "planirano"
  ).length;
  const brojIzvrseno = filtrirani.filter(
    (i) => autoStatus(i) === "izvrseno"
  ).length;
  const brojKasni = filtrirani.filter((i) => autoStatus(i) === "kasni").length;

  const spremi = async () => {
    try {
      setGreska("");

      if (!forma.naziv.trim() || !forma.datum) {
        setGreska("Naziv i datum su obavezni.");
        return;
      }

      setSaving(true);

      const payload = {
        firmaId,
        naziv: forma.naziv,
        opis: forma.opis,
        datum: forma.datum,
        tip: forma.tip,
        status: forma.status,
        radnikId: forma.radnikId || null,
        opremaId: forma.opremaId || null,
      };

      const res = await fetch(
        editId ? `/api/planer/${editId}` : "/api/planer",
        {
          method: editId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti planer.");
      }

      setForma((prev) => ({
        ...praznaForma,
        datum: odabraniDatum || "",
      }));
      setEditId(null);
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri spremanju.");
    } finally {
      setSaving(false);
    }
  };

  const spremiBrzo = async () => {
    try {
      setGreska("");

      if (!brzaForma.naziv.trim() || !brzaForma.datum) {
        setGreska("Naziv i datum su obavezni.");
        return;
      }

      setQuickSaving(true);

      const payload = {
        firmaId,
        naziv: brzaForma.naziv,
        opis: brzaForma.opis,
        datum: brzaForma.datum,
        tip: brzaForma.tip,
        status: brzaForma.status,
        radnikId: brzaForma.radnikId || null,
        opremaId: brzaForma.opremaId || null,
      };

      const res = await fetch("/api/planer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti planer.");
      }

      setShowQuickModal(false);
      setBrzaForma(praznaForma);
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri spremanju.");
    } finally {
      setQuickSaving(false);
    }
  };

  const spremiEditModal = async () => {
    try {
      setGreska("");

      if (!modalEditId) {
        setGreska("Nedostaje ID stavke.");
        return;
      }

      if (!editForma.naziv.trim() || !editForma.datum) {
        setGreska("Naziv i datum su obavezni.");
        return;
      }

      setEditModalSaving(true);

      const payload = {
        firmaId,
        naziv: editForma.naziv,
        opis: editForma.opis,
        datum: editForma.datum,
        tip: editForma.tip,
        status: editForma.status,
        radnikId: editForma.radnikId || null,
        opremaId: editForma.opremaId || null,
      };

      const res = await fetch(`/api/planer/${modalEditId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti izmjene.");
      }

      setShowEditModal(false);
      setModalEditId(null);
      setEditForma(praznaForma);
      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri spremanju.");
    } finally {
      setEditModalSaving(false);
    }
  };

  const obrisi = async (id: string) => {
    const potvrda = window.confirm("Obrisati stavku iz planera?");
    if (!potvrda) return;

    try {
      const res = await fetch(`/api/planer/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati zapis.");
      }

      if (editId === id) {
        setEditId(null);
        setForma((prev) => ({
          ...praznaForma,
          datum: odabraniDatum || prev.datum,
        }));
      }

      if (modalEditId === id) {
        setShowEditModal(false);
        setModalEditId(null);
        setEditForma(praznaForma);
      }

      if (odabraniId === id) {
        setOdabraniId(null);
      }

      await ucitajSve();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
  };

  const obrisiIzModala = async () => {
    if (!modalEditId) return;
    await obrisi(modalEditId);
  };

  const uredi = (item: PlanerItem) => {
    setEditId(item.id);
    setForma({
      naziv: item.naziv,
      opis: item.opis || "",
      datum: parseDate(item.datum),
      tip: item.tip,
      status: autoStatus(item) === "izvrseno" ? "izvrseno" : "planirano",
      radnikId: item.radnikId || "",
      opremaId: item.opremaId || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const otvoriEditModal = (item: PlanerItem) => {
    setOdabraniId(item.id);
    setModalEditId(item.id);
    setEditForma({
      naziv: item.naziv,
      opis: item.opis || "",
      datum: parseDate(item.datum),
      tip: item.tip,
      status: autoStatus(item) === "izvrseno" ? "izvrseno" : "planirano",
      radnikId: item.radnikId || "",
      opremaId: item.opremaId || "",
    });
    setShowEditModal(true);
  };

  const onEventClick = (info: EventClickArg) => {
    const item = items.find((i) => i.id === info.event.id);
    setOdabraniId(info.event.id);

    if (item) {
      otvoriEditModal(item);
    }
  };

  const onDateClick = (info: { dateStr: string }) => {
    setOdabraniDatum(info.dateStr);
    setForma((prev) => ({
      ...prev,
      datum: info.dateStr,
      status: "planirano",
    }));

    setBrzaForma({
      ...praznaForma,
      datum: info.dateStr,
      status: "planirano",
    });

    setEditId(null);
    setShowQuickModal(true);
  };

  const resetirajFiltere = () => {
    setSearchNaziv("");
    setFilterTip("");
    setFilterStatus("");
    setFilterVeza("");
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

  if (greska && !tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h1 style={{ marginTop: 0 }}>Greška</h1>
            <p>{greska}</p>
            <Link href={`/tvrtke/${firmaId}`} style={primaryLinkStyle}>
              Natrag na tvrtku
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style jsx global>{`
        .fc {
          --fc-border-color: #e5e7eb;
          --fc-page-bg-color: #ffffff;
          --fc-neutral-bg-color: #f9fafb;
          --fc-today-bg-color: #eff6ff;
          --fc-list-event-hover-bg-color: #f3f4f6;
          font-family: inherit;
        }

        .fc .fc-toolbar.fc-header-toolbar {
          margin-bottom: 1rem;
          gap: 12px;
          flex-wrap: wrap;
        }

        .fc .fc-toolbar-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #111827;
        }

        .fc .fc-button {
          background: #111827 !important;
          border: 1px solid #111827 !important;
          border-radius: 10px !important;
          padding: 0.55rem 0.85rem !important;
          font-weight: 700 !important;
          box-shadow: none !important;
        }

        .fc .fc-button:hover {
          background: #1f2937 !important;
          border-color: #1f2937 !important;
        }

        .fc .fc-button:disabled {
          opacity: 0.5 !important;
        }

        .fc .fc-col-header-cell {
          background: #f9fafb;
          padding: 10px 0;
        }

        .fc .fc-col-header-cell-cushion {
          color: #374151;
          font-weight: 700;
          text-decoration: none;
          padding: 8px 6px;
        }

        .fc .fc-daygrid-day-number {
          color: #111827;
          text-decoration: none;
          font-weight: 700;
          padding: 8px !important;
        }

        .fc .fc-daygrid-day-frame {
          min-height: 110px;
          padding: 4px;
        }

        .fc .fc-day-today {
          box-shadow: inset 0 0 0 2px #93c5fd;
        }

        .fc .fc-event {
          border-radius: 10px !important;
          padding: 2px 4px !important;
          font-size: 0.78rem !important;
          font-weight: 700 !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          cursor: pointer;
        }

        .fc .fc-daygrid-more-link {
          color: #2563eb;
          font-weight: 700;
        }

        .fc .fc-scrollgrid {
          border-radius: 16px;
          overflow: hidden;
        }
      `}</style>

      <div style={containerStyle}>
        <div style={{ marginBottom: 16 }}>
          <Link href={`/tvrtke/${firmaId}`} style={backLinkStyle}>
            ← Natrag na tvrtku
          </Link>
        </div>

        <div style={heroCardStyle}>
          <div style={heroTopStyle}>
            <div>
              <div style={heroBadgeStyle}>Planer</div>
              <h1 style={heroTitleStyle}>{tvrtka?.naziv || "Tvrtka"}</h1>
              <div style={heroMetaStyle}>
                Planiranje liječničkih pregleda, servisa, ispitivanja i drugih
                obaveza.
              </div>
            </div>

            <div style={toggleWrapStyle}>
              <button
                type="button"
                onClick={() => setPrikaz("kalendar")}
                style={{
                  ...toggleButtonStyle,
                  ...(prikaz === "kalendar" ? activeToggleButtonStyle : {}),
                }}
              >
                Kalendar
              </button>

              <button
                type="button"
                onClick={() => setPrikaz("lista")}
                style={{
                  ...toggleButtonStyle,
                  ...(prikaz === "lista" ? activeToggleButtonStyle : {}),
                }}
              >
                Lista
              </button>
            </div>
          </div>
        </div>

        <div style={statsGridStyle}>
          <StatKartica naslov="Ukupno stavki" vrijednost={brojUkupno} />
          <StatKartica naslov="Planirano" vrijednost={brojPlanirano} />
          <StatKartica naslov="Izvršeno" vrijednost={brojIzvrseno} />
          <StatKartica
            naslov="Kasni"
            vrijednost={brojKasni}
            highlight={brojKasni > 0}
          />
        </div>

        <div style={cardStyle}>
          <div style={sectionTopStyle}>
            <h2 style={sectionTitleStyle}>
              {editId ? "Uredi stavku" : "Dodaj novu stavku"}
            </h2>

            {editId ? (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForma((prev) => ({
                    ...praznaForma,
                    datum: odabraniDatum || prev.datum,
                  }));
                }}
                style={secondaryButtonStyle}
              >
                Odustani
              </button>
            ) : null}
          </div>

          {odabraniDatum && !editId ? (
            <div style={selectedDateBannerStyle}>
              Odabrani datum iz kalendara:{" "}
              <strong>{formatDate(odabraniDatum)}</strong>
            </div>
          ) : null}

          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>Naziv *</label>
              <input
                value={forma.naziv}
                onChange={(e) =>
                  setForma((p) => ({ ...p, naziv: e.target.value }))
                }
                style={inputStyle}
                placeholder="npr. Liječnički pregled Ivana Horvata"
              />
            </div>

            <div>
              <label style={labelStyle}>Datum *</label>
              <input
                type="date"
                value={forma.datum}
                onChange={(e) =>
                  setForma((p) => ({ ...p, datum: e.target.value }))
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tip</label>
              <select
                value={forma.tip}
                onChange={(e) =>
                  setForma((p) => ({ ...p, tip: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="lijecnicki">Liječnički</option>
                <option value="servis">Servis</option>
                <option value="ispitivanje">Ispitivanje</option>
                <option value="osposobljavanje">Osposobljavanje</option>
                <option value="ostalo">Ostalo</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={forma.status}
                onChange={(e) =>
                  setForma((p) => ({ ...p, status: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="planirano">Planirano</option>
                <option value="izvrseno">Izvršeno</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Radnik</label>
              <select
                value={forma.radnikId}
                onChange={(e) =>
                  setForma((p) => ({ ...p, radnikId: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="">Nije vezano za radnika</option>
                {radnici.map((radnik) => (
                  <option key={radnik.id} value={radnik.id}>
                    {radnik.ime}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Stroj / oprema</label>
              <select
                value={forma.opremaId}
                onChange={(e) =>
                  setForma((p) => ({ ...p, opremaId: e.target.value }))
                }
                style={inputStyle}
              >
                <option value="">Nije vezano za stroj</option>
                {strojevi.map((stroj) => (
                  <option key={stroj.id} value={stroj.id}>
                    {stroj.naziv}
                    {stroj.serijskiBroj ? ` (${stroj.serijskiBroj})` : ""}
                    {!stroj.serijskiBroj && stroj.inventarniBroj
                      ? ` (${stroj.inventarniBroj})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Opis</label>
              <textarea
                value={forma.opis}
                onChange={(e) =>
                  setForma((p) => ({ ...p, opis: e.target.value }))
                }
                style={textareaStyle}
                placeholder="Napomena, lokacija, kontakt, detalji..."
              />
            </div>
          </div>

          {greska ? <div style={errorStyle}>{greska}</div> : null}

          <div style={actionsRowStyle}>
            <button
              type="button"
              onClick={spremi}
              disabled={saving}
              style={primaryButtonStyle}
            >
              {saving
                ? "Spremanje..."
                : editId
                ? "Spremi izmjene"
                : "Dodaj stavku"}
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTopStyle}>
            <h2 style={sectionTitleStyle}>Pretraga i filteri</h2>

            <button
              type="button"
              onClick={resetirajFiltere}
              style={secondaryButtonStyle}
            >
              Očisti sve
            </button>
          </div>

          <div style={searchWrapStyle}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Pretraga po nazivu / opisu / radniku / stroju</label>
              <input
                value={searchNaziv}
                onChange={(e) => setSearchNaziv(e.target.value)}
                style={inputStyle}
                placeholder="npr. servis, ivan, pregled, kompresor..."
              />
            </div>
          </div>

          <div style={filtersGridStyle}>
            <div>
              <label style={labelStyle}>Tip</label>
              <select
                value={filterTip}
                onChange={(e) => setFilterTip(e.target.value)}
                style={inputStyle}
              >
                <option value="">Svi tipovi</option>
                <option value="lijecnicki">Liječnički</option>
                <option value="servis">Servis</option>
                <option value="ispitivanje">Ispitivanje</option>
                <option value="osposobljavanje">Osposobljavanje</option>
                <option value="ostalo">Ostalo</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={inputStyle}
              >
                <option value="">Svi statusi</option>
                <option value="planirano">Planirano</option>
                <option value="izvrseno">Izvršeno</option>
                <option value="kasni">Kasni</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Veza</label>
              <select
                value={filterVeza}
                onChange={(e) => setFilterVeza(e.target.value)}
                style={inputStyle}
              >
                <option value="">Sve stavke</option>
                <option value="radnik">Samo vezano za radnika</option>
                <option value="stroj">Samo vezano za stroj</option>
                <option value="bez-veze">Bez veze</option>
              </select>
            </div>
          </div>
        </div>

        {prikaz === "kalendar" ? (
          <>
            <div style={legendWrapStyle}>
              <LegendaStavka label="Liječnički" bg="#dbeafe" border="#60a5fa" color="#1d4ed8" />
              <LegendaStavka label="Servis" bg="#fef3c7" border="#fbbf24" color="#92400e" />
              <LegendaStavka label="Ispitivanje" bg="#ede9fe" border="#a78bfa" color="#6d28d9" />
              <LegendaStavka label="Osposobljavanje" bg="#dcfce7" border="#4ade80" color="#166534" />
              <LegendaStavka label="Izvršeno" bg="#dcfce7" border="#4ade80" color="#166534" />
              <LegendaStavka label="Kasni" bg="#fee2e2" border="#f87171" color="#991b1b" />
            </div>

            <div style={calendarLayoutStyle}>
              <div style={calendarWrapStyle}>
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale={hrLocale}
                  height="auto"
                  firstDay={1}
                  events={kalendarEventi}
                  eventClick={onEventClick}
                  dateClick={onDateClick}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "",
                  }}
                  buttonText={{
                    today: "Danas",
                  }}
                  eventDisplay="block"
                />
              </div>

              <div style={sidePanelStyle}>
                <h2 style={sectionTitleStyle}>Detalji događaja</h2>

                {!odabraniItem ? (
                  <div style={emptyStyle}>
                    Klikni na događaj za detalje ili na datum za brzi unos.
                  </div>
                ) : (
                  <div style={detailStackStyle}>
                    <div style={detailCardStyle}>
                      <div style={detailLabelStyle}>Naziv</div>
                      <div style={detailValueStyle}>{odabraniItem.naziv}</div>
                    </div>

                    <div style={detailCardStyle}>
                      <div style={detailLabelStyle}>Datum</div>
                      <div style={detailValueStyle}>
                        {formatDate(odabraniItem.datum)}
                      </div>
                    </div>

                    <div style={detailCardStyle}>
                      <div style={detailLabelStyle}>Tip</div>
                      <div style={detailValueStyle}>{odabraniItem.tip}</div>
                    </div>

                    <div style={detailCardStyle}>
                      <div style={detailLabelStyle}>Status</div>
                      <div style={detailValueStyle}>
                        {autoStatus(odabraniItem)}
                      </div>
                    </div>

                    <div style={detailCardStyle}>
                      <div style={detailLabelStyle}>Radnik</div>
                      <div style={detailValueStyle}>
                        {nazivRadnika(odabraniItem.radnikId)}
                      </div>
                    </div>

                    <div style={detailCardStyle}>
                      <div style={detailLabelStyle}>Stroj / oprema</div>
                      <div style={detailValueStyle}>
                        {nazivStroja(odabraniItem.opremaId)}
                      </div>
                    </div>

                    <div style={detailCardStyle}>
                      <div style={detailLabelStyle}>Opis</div>
                      <div style={detailValueStyle}>
                        {odabraniItem.opis || "-"}
                      </div>
                    </div>

                    <div style={actionsCellStyle}>
                      <button
                        type="button"
                        onClick={() => otvoriEditModal(odabraniItem)}
                        style={smallButtonStyle}
                      >
                        Uredi u modalu
                      </button>

                      <button
                        type="button"
                        onClick={() => uredi(odabraniItem)}
                        style={secondarySmallButtonStyle}
                      >
                        Uredi gore
                      </button>

                      <button
                        type="button"
                        onClick={() => obrisi(odabraniItem.id)}
                        style={dangerButtonStyle}
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>
              Planirane obaveze ({filtrirani.length})
            </h2>

            {filtrirani.length === 0 ? (
              <div style={emptyStyle}>Nema stavki u planeru.</div>
            ) : (
              <div style={tableWrapStyle}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Naziv</th>
                      <th style={thStyle}>Datum</th>
                      <th style={thStyle}>Tip</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Radnik</th>
                      <th style={thStyle}>Stroj / oprema</th>
                      <th style={thStyle}>Opis</th>
                      <th style={thStyle}>Akcije</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrirani.map((item) => (
                      <tr key={item.id}>
                        <td style={tdStyle}>{item.naziv}</td>
                        <td style={tdStyle}>{formatDate(item.datum)}</td>
                        <td style={tdStyle}>{item.tip}</td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              ...statusPillBaseStyle,
                              ...statusBoja(item),
                            }}
                          >
                            {autoStatus(item)}
                          </span>
                        </td>
                        <td style={tdStyle}>{nazivRadnika(item.radnikId)}</td>
                        <td style={tdStyle}>{nazivStroja(item.opremaId)}</td>
                        <td style={tdStyle}>{item.opis || "-"}</td>
                        <td style={tdStyle}>
                          <div style={actionsCellStyle}>
                            <button
                              type="button"
                              onClick={() => otvoriEditModal(item)}
                              style={smallButtonStyle}
                            >
                              Uredi modal
                            </button>
                            <button
                              type="button"
                              onClick={() => uredi(item)}
                              style={secondarySmallButtonStyle}
                            >
                              Uredi gore
                            </button>
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
        )}
      </div>

      {showQuickModal ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={heroBadgeStyle}>Brzi unos</div>
                <h2 style={modalTitleStyle}>
                  Nova stavka za {formatDate(brzaForma.datum)}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowQuickModal(false);
                  setBrzaForma(praznaForma);
                }}
                style={modalCloseButtonStyle}
              >
                ✕
              </button>
            </div>

            <div style={quickFormGridStyle}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Naziv *</label>
                <input
                  value={brzaForma.naziv}
                  onChange={(e) =>
                    setBrzaForma((p) => ({ ...p, naziv: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="npr. Servis stroja, liječnički pregled..."
                />
              </div>

              <div>
                <label style={labelStyle}>Datum *</label>
                <input
                  type="date"
                  value={brzaForma.datum}
                  onChange={(e) =>
                    setBrzaForma((p) => ({ ...p, datum: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Tip</label>
                <select
                  value={brzaForma.tip}
                  onChange={(e) =>
                    setBrzaForma((p) => ({ ...p, tip: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="lijecnicki">Liječnički</option>
                  <option value="servis">Servis</option>
                  <option value="ispitivanje">Ispitivanje</option>
                  <option value="osposobljavanje">Osposobljavanje</option>
                  <option value="ostalo">Ostalo</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={brzaForma.status}
                  onChange={(e) =>
                    setBrzaForma((p) => ({ ...p, status: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="planirano">Planirano</option>
                  <option value="izvrseno">Izvršeno</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Radnik</label>
                <select
                  value={brzaForma.radnikId}
                  onChange={(e) =>
                    setBrzaForma((p) => ({ ...p, radnikId: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="">Nije vezano za radnika</option>
                  {radnici.map((radnik) => (
                    <option key={radnik.id} value={radnik.id}>
                      {radnik.ime}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Stroj / oprema</label>
                <select
                  value={brzaForma.opremaId}
                  onChange={(e) =>
                    setBrzaForma((p) => ({ ...p, opremaId: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="">Nije vezano za stroj</option>
                  {strojevi.map((stroj) => (
                    <option key={stroj.id} value={stroj.id}>
                      {stroj.naziv}
                      {stroj.serijskiBroj ? ` (${stroj.serijskiBroj})` : ""}
                      {!stroj.serijskiBroj && stroj.inventarniBroj
                        ? ` (${stroj.inventarniBroj})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Opis</label>
                <textarea
                  value={brzaForma.opis}
                  onChange={(e) =>
                    setBrzaForma((p) => ({ ...p, opis: e.target.value }))
                  }
                  style={textareaStyle}
                  placeholder="Napomena, lokacija, kontakt, detalji..."
                />
              </div>
            </div>

            {greska ? <div style={errorStyle}>{greska}</div> : null}

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={() => {
                  setShowQuickModal(false);
                  setBrzaForma(praznaForma);
                }}
                style={secondaryButtonStyle}
              >
                Zatvori
              </button>

              <button
                type="button"
                onClick={spremiBrzo}
                disabled={quickSaving}
                style={primaryButtonStyle}
              >
                {quickSaving ? "Spremanje..." : "Spremi brzo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <div style={heroBadgeStyle}>Uredi događaj</div>
                <h2 style={modalTitleStyle}>
                  {editForma.naziv || "Uredi stavku"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setModalEditId(null);
                  setEditForma(praznaForma);
                }}
                style={modalCloseButtonStyle}
              >
                ✕
              </button>
            </div>

            <div style={quickFormGridStyle}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Naziv *</label>
                <input
                  value={editForma.naziv}
                  onChange={(e) =>
                    setEditForma((p) => ({ ...p, naziv: e.target.value }))
                  }
                  style={inputStyle}
                  placeholder="Naziv stavke"
                />
              </div>

              <div>
                <label style={labelStyle}>Datum *</label>
                <input
                  type="date"
                  value={editForma.datum}
                  onChange={(e) =>
                    setEditForma((p) => ({ ...p, datum: e.target.value }))
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Tip</label>
                <select
                  value={editForma.tip}
                  onChange={(e) =>
                    setEditForma((p) => ({ ...p, tip: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="lijecnicki">Liječnički</option>
                  <option value="servis">Servis</option>
                  <option value="ispitivanje">Ispitivanje</option>
                  <option value="osposobljavanje">Osposobljavanje</option>
                  <option value="ostalo">Ostalo</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={editForma.status}
                  onChange={(e) =>
                    setEditForma((p) => ({ ...p, status: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="planirano">Planirano</option>
                  <option value="izvrseno">Izvršeno</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Radnik</label>
                <select
                  value={editForma.radnikId}
                  onChange={(e) =>
                    setEditForma((p) => ({ ...p, radnikId: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="">Nije vezano za radnika</option>
                  {radnici.map((radnik) => (
                    <option key={radnik.id} value={radnik.id}>
                      {radnik.ime}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Stroj / oprema</label>
                <select
                  value={editForma.opremaId}
                  onChange={(e) =>
                    setEditForma((p) => ({ ...p, opremaId: e.target.value }))
                  }
                  style={inputStyle}
                >
                  <option value="">Nije vezano za stroj</option>
                  {strojevi.map((stroj) => (
                    <option key={stroj.id} value={stroj.id}>
                      {stroj.naziv}
                      {stroj.serijskiBroj ? ` (${stroj.serijskiBroj})` : ""}
                      {!stroj.serijskiBroj && stroj.inventarniBroj
                        ? ` (${stroj.inventarniBroj})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Opis</label>
                <textarea
                  value={editForma.opis}
                  onChange={(e) =>
                    setEditForma((p) => ({ ...p, opis: e.target.value }))
                  }
                  style={textareaStyle}
                  placeholder="Napomena, lokacija, kontakt, detalji..."
                />
              </div>
            </div>

            {greska ? <div style={errorStyle}>{greska}</div> : null}

            <div style={modalActionsBetweenStyle}>
              <button
                type="button"
                onClick={obrisiIzModala}
                style={dangerButtonStyle}
              >
                Obriši
              </button>

              <div style={modalActionsStyle}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setModalEditId(null);
                    setEditForma(praznaForma);
                  }}
                  style={secondaryButtonStyle}
                >
                  Zatvori
                </button>

                <button
                  type="button"
                  onClick={spremiEditModal}
                  disabled={editModalSaving}
                  style={primaryButtonStyle}
                >
                  {editModalSaving ? "Spremanje..." : "Spremi izmjene"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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

function LegendaStavka({
  label,
  bg,
  border,
  color,
}: {
  label: string;
  bg: string;
  border: string;
  color: string;
}) {
  return (
    <div
      style={{
        ...legendItemStyle,
        background: bg,
        border: `1px solid ${border}`,
        color,
      }}
    >
      <span
        style={{
          ...legendDotStyle,
          background: border,
        }}
      />
      {label}
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
  gap: 16,
  alignItems: "center",
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
  color: "#374151",
  fontSize: 15,
};

const toggleWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const toggleButtonStyle: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const activeToggleButtonStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 24,
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
  alignItems: "center",
  marginBottom: 16,
  gap: 12,
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: 0,
  color: "#111827",
};

const selectedDateBannerStyle: React.CSSProperties = {
  background: "#eff6ff",
  border: "1px solid #93c5fd",
  color: "#1d4ed8",
  borderRadius: 12,
  padding: "10px 12px",
  marginBottom: 16,
  fontWeight: 700,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const quickFormGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const searchWrapStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 14,
  marginBottom: 14,
};

const filtersGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 14,
};

const legendWrapStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 16,
};

const legendItemStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 700,
};

const legendDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
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
  background: "white",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 90,
  border: "1px solid #d1d5db",
  borderRadius: 10,
  padding: "11px 12px",
  fontSize: 14,
  resize: "vertical",
  background: "white",
};

const actionsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
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

const secondarySmallButtonStyle: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer",
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

const calendarLayoutStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 0.9fr",
  gap: 20,
  alignItems: "start",
};

const calendarWrapStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 20,
};

const sidePanelStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 20,
  position: "sticky",
  top: 24,
};

const detailStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const detailCardStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#6b7280",
  marginBottom: 6,
  textTransform: "uppercase",
};

const detailValueStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#111827",
  fontWeight: 600,
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
};

const tdStyle: React.CSSProperties = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  fontSize: 14,
  color: "#111827",
};

const statusPillBaseStyle: React.CSSProperties = {
  display: "inline-block",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
};

const actionsCellStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
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

const dangerButtonStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "8px 10px",
  fontWeight: 700,
  cursor: "pointer",
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

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 24, 39, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 1000,
};

const modalCardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 760,
  background: "white",
  borderRadius: 22,
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  padding: 24,
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 18,
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  color: "#111827",
};

const modalCloseButtonStyle: React.CSSProperties = {
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 10,
  width: 40,
  height: 40,
  fontWeight: 800,
  cursor: "pointer",
};

const modalActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18,
};

const modalActionsBetweenStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 18,
  flexWrap: "wrap",
};