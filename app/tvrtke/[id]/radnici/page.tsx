"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

type Radnik = {
  id: string;
  firmaId: string;
  ime: string;
  oib: string;
  aktivan: boolean;
  datumOdjave: string | null;
  datumZaposlenja: string;
  datumRodjenja: string | null;
  grad: string | null;
  radnoMjesto: string | null;
  imaDozvolu: boolean;
  dozvolaDo: string | null;
  znrOsposobljen: boolean;
  znrDatum: string | null;
  zopOsposobljen: boolean;
  zopDatum: string | null;
};

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
  adresa: string | null;
};

type Pregled = {
  id: string;
  firmaId: string;
  oib: string;
  vrsta: string | null;
  datum: string;
  vrijediDo: string;
  napomena: string | null;
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

type FormaRadnik = {
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
  znrOsposobljen: boolean;
  znrDatum: string;
  zopOsposobljen: boolean;
  zopDatum: string;
};

type CsvImportRow = {
  ime: string;
  prezime: string;
  oib: string;
  aktivan: string;
  datumOdjave: string;
  datumZaposlenja: string;
  datumRodjenja: string;
  grad: string;
  radnoMjesto: string;
  imaDozvolu: string;
  dozvolaDo: string;
  znrOsposobljen: string;
  znrDatum: string;
  zopOsposobljen: string;
  zopDatum: string;
};

const prazni: FormaRadnik = {
  ime: "",
  oib: "",
  aktivan: true,
  datumOdjave: "",
  datumZaposlenja: "",
  datumRodjenja: "",
  grad: "",
  radnoMjesto: "",
  imaDozvolu: false,
  dozvolaDo: "",
  znrOsposobljen: false,
  znrDatum: "",
  zopOsposobljen: false,
  zopDatum: "",
};

export default function RadniciTvrtkePage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [pregledi, setPregledi] = useState<Pregled[]>([]);
  const [osposobljavanja, setOsposobljavanja] = useState<Osposobljavanje[]>(
    []
  );
  const [forma, setForma] = useState<FormaRadnik>(prazni);
  const [editId, setEditId] = useState<string | null>(null);
  const [detalji, setDetalji] = useState<Radnik | null>(null);

  const [filterIme, setFilterIme] = useState("");
  const [filterOib, setFilterOib] = useState("");
  const [filterAktivan, setFilterAktivan] = useState("svi");
  const [filterRadnoMjesto, setFilterRadnoMjesto] = useState("");
  const [samoUpozorenja, setSamoUpozorenja] = useState(false);

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

      const [tvrtkeRes, radniciRes, preglediRes, osposobljavanjaRes] =
        await Promise.all([
          fetch("/api/tvrtke", { cache: "no-store" }),
          fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
            cache: "no-store",
          }),
          fetch(`/api/lijecnicki?firmaId=${encodeURIComponent(firmaId)}`, {
            cache: "no-store",
          }),
          fetch(`/api/osposobljavanja?firmaId=${encodeURIComponent(firmaId)}`, {
            cache: "no-store",
          }),
        ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu učitati tvrtku.");
      if (!radniciRes.ok) throw new Error("Ne mogu učitati radnike.");
      if (!preglediRes.ok) throw new Error("Ne mogu učitati liječničke.");
      if (!osposobljavanjaRes.ok) {
        throw new Error("Ne mogu učitati osposobljavanja.");
      }

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const preglediData: Pregled[] = await preglediRes.json();
      const osposobljavanjaData: Osposobljavanje[] =
        await osposobljavanjaRes.json();

      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;
      if (!nadenaTvrtka) {
        throw new Error("Tvrtka nije pronađena.");
      }

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);
      setPregledi(preglediData);
      setOsposobljavanja(osposobljavanjaData);
    } catch (err) {
      setGreska(
        err instanceof Error ? err.message : "Greška pri učitavanju."
      );
    } finally {
      setUcitavanje(false);
    }
  };

  const parseDate = (value: string): string => {
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

  const formatDate = (value: string | null): string => {
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

  const csvEscape = (
    value: string | number | boolean | null | undefined
  ) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const exportRadniciCsv = () => {
    const headers = [
      "Aktivan",
      "Ime i prezime",
      "OIB",
      "Početak rada",
      "Datum rođenja",
      "Grad / mjesto",
      "Radno mjesto",
      "Datum odjave",
      "Ima radnu dozvolu",
      "Radna dozvola do",
      "ZNR osposobljen",
      "Datum ZNR",
      "ZOP osposobljen",
      "Datum ZOP",
    ];

    const rows = filtriraniRadnici.map((r) => [
      r.aktivan ? "Da" : "Ne",
      r.ime,
      r.oib,
      formatDate(r.datumZaposlenja),
      formatDate(r.datumRodjenja),
      r.grad || "",
      r.radnoMjesto || "",
      formatDate(r.datumOdjave),
      r.imaDozvolu ? "Da" : "Ne",
      formatDate(r.dozvolaDo),
      r.znrOsposobljen ? "Da" : "Ne",
      formatDate(r.znrDatum),
      r.zopOsposobljen ? "Da" : "Ne",
      formatDate(r.zopDatum),
    ]);

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
    a.download = `radnici-${tvrtka?.naziv || "tvrtka"}.csv`;
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

  const headerRaw = parseCsvLine(lines[0]);
  const header = headerRaw.map(normalizeHeader);

  const indexOf = (...aliases: string[]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    return header.findIndex((h) => normalizedAliases.includes(h));
  };

  const idxAktivan = indexOf("aktivan", "status");
  const idxIme = indexOf("ime i prezime", "ime", "radnik");
  const idxPrezime = indexOf("prezime");

  const idxOib = indexOf("oib", "oib radnika");

  const idxDatumZaposlenja = indexOf(
    "pocetak rada",
    "početak rada",
    "datum zaposlenja",
    "datum zaposljenja",
    "zaposlenje"
  );

  const idxDatumOdjave = indexOf("datum odjave", "odjava");
  const idxDatumRodjenja = indexOf("datum rodjenja", "datum rođenja");
  const idxGrad = indexOf("grad", "grad / mjesto", "grad mjesto");
  const idxRadnoMjesto = indexOf("radno mjesto");
  const idxImaDozvolu = indexOf("ima radnu dozvolu", "dozvola");
  const idxDozvolaDo = indexOf("radna dozvola do", "dozvola do");
  const idxZnrOsposobljen = indexOf("znr osposobljen", "znr");
  const idxZnrDatum = indexOf("datum znr", "znr datum");
  const idxZopOsposobljen = indexOf("zop osposobljen", "zop");
  const idxZopDatum = indexOf("datum zop", "zop datum");

  const isDateLike = (value: string) => {
    const v = value.trim();

    if (!v || v === "0") return false;

    return (
      /^\d{1,2}\.\d{1,2}\.\d{4}\.?$/.test(v) ||
      /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v) ||
      /^\d{4}-\d{2}-\d{2}$/.test(v) ||
      /^\d{4,6}$/.test(v)
    );
  };

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);

    const get = (index: number) => {
      if (index < 0) return "";
      return String(cols[index] ?? "").trim();
    };

    let ime = get(idxIme);

    let prezime =
      idxPrezime >= 0
        ? get(idxPrezime)
        : idxIme >= 0
        ? get(idxIme + 1)
        : "";

    const oib = get(idxOib);

    let datumZaposlenja = get(idxDatumZaposlenja);

    if (!isDateLike(datumZaposlenja)) {
      const datumIzReda = cols.find((col, index) => {
        if (index <= idxOib) return false;
        return isDateLike(String(col ?? ""));
      });

      datumZaposlenja = datumIzReda ? String(datumIzReda).trim() : "";
    }

    return {
      ime,
      prezime,
      oib,
      aktivan: get(idxAktivan),
      datumOdjave: get(idxDatumOdjave),
      datumZaposlenja,
      datumRodjenja: get(idxDatumRodjenja),
      grad: get(idxGrad),
      radnoMjesto: get(idxRadnoMjesto),
      imaDozvolu: get(idxImaDozvolu),
      dozvolaDo: get(idxDozvolaDo),
      znrOsposobljen: get(idxZnrOsposobljen),
      znrDatum: get(idxZnrDatum),
      zopOsposobljen: get(idxZopOsposobljen),
      zopDatum: get(idxZopDatum),
    };
  });
};

  const readFileRows = async (file: File) => {
  const name = file.name.toLowerCase();

  // =====================
  // EXCEL (.xlsx)
  // =====================
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
    });

    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
      defval: "",
    });

    return rows;
  }

  // =====================
  // CSV
  // =====================
  const text = await file.text();

  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const delimiter =
    lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";

  const headers = lines[0].split(delimiter).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cols = line.split(delimiter);

    const obj: any = {};
    headers.forEach((h, i) => {
      obj[h] = cols[i];
    });

    return obj;
  });
};

const importCsv = async () => {
  if (!firmaId) {
    alert("Nedostaje ID tvrtke.");
    return;
  }

  if (!csvFile) {
    alert("Odaberi CSV ili Excel file.");
    return;
  }

  try {
    setImportanje(true);
    setGreska("");

    const rows = await readFileRows(csvFile);

    if (!rows.length) {
      throw new Error("Datoteka nema podataka.");
    }

    const res = await fetch("/api/radnici/import", {
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
      throw new Error(txt || "Greška kod uvoza.");
    }

    const result = await res.json();

    alert(JSON.stringify(result, null, 2));

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

  const daysUntil = (value: string | null): number | null => {
    if (!value) return null;

    const iso = parseDate(value) || value;
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
      (targetOnly.getTime() - todayOnly.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  const statusRoka = (value: string | null) => {
    const diff = daysUntil(value);

    if (diff === null) return { text: "-", level: "none" as const };
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
    return { text: `Važi još ${diff} dana`, level: "ok" as const };
  };

  const badgeStyle = (value: string | null): React.CSSProperties => {
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

  const imaUpozorenje = (radnik: Radnik) => {
    const dozvola =
      radnik.imaDozvolu && radnik.dozvolaDo
        ? ["expired", "warning"].includes(statusRoka(radnik.dozvolaDo).level)
        : false;

    const lijecnicki = pregledi.some(
      (p) =>
        p.oib === radnik.oib &&
        ["expired", "warning"].includes(statusRoka(p.vrijediDo).level)
    );

    const strucno = osposobljavanja.some(
      (o) =>
        o.oib === radnik.oib &&
        ["expired", "warning"].includes(statusRoka(o.vrijediDo).level)
    );

    return dozvola || lijecnicki || strucno;
  };

  const upozorenja = useMemo(() => {
    const lista: Array<{
      tip: string;
      ime: string;
      datum: string;
      status: string;
      level: "expired" | "warning";
    }> = [];

    radnici.forEach((r) => {
      if (r.imaDozvolu && r.dozvolaDo) {
        const s = statusRoka(r.dozvolaDo);
        if (s.level === "expired" || s.level === "warning") {
          lista.push({
            tip: "Radna dozvola",
            ime: r.ime,
            datum: formatDate(r.dozvolaDo),
            status: s.text,
            level: s.level,
          });
        }
      }
    });

    pregledi.forEach((p) => {
      const s = statusRoka(p.vrijediDo);
      if (s.level === "expired" || s.level === "warning") {
        const radnik = radnici.find((r) => r.oib === p.oib);
        lista.push({
          tip: "Liječnički pregled",
          ime: radnik?.ime || p.oib,
          datum: formatDate(p.vrijediDo),
          status: s.text,
          level: s.level,
        });
      }
    });

    osposobljavanja.forEach((o) => {
      const s = statusRoka(o.vrijediDo);
      if (s.level === "expired" || s.level === "warning") {
        const radnik = radnici.find((r) => r.oib === o.oib);
        lista.push({
          tip: "Stručno osposobljavanje",
          ime: radnik?.ime || o.oib,
          datum: formatDate(o.vrijediDo),
          status: s.text,
          level: s.level,
        });
      }
    });

    return lista;
  }, [radnici, pregledi, osposobljavanja]);

  const filtriraniRadnici = useMemo(() => {
    return radnici.filter((r) => {
      const okIme =
        !filterIme ||
        r.ime.toLowerCase().includes(filterIme.toLowerCase());

      const okOib = !filterOib || r.oib.includes(filterOib);

      const okAktivan =
        filterAktivan === "svi" ||
        (filterAktivan === "aktivni" && r.aktivan) ||
        (filterAktivan === "neaktivni" && !r.aktivan);

      const okRadnoMjesto =
        !filterRadnoMjesto ||
        (r.radnoMjesto || "")
          .toLowerCase()
          .includes(filterRadnoMjesto.toLowerCase());

      const okUpozorenja = !samoUpozorenja || imaUpozorenje(r);

      return (
        okIme &&
        okOib &&
        okAktivan &&
        okRadnoMjesto &&
        okUpozorenja
      );
    });
  }, [
    radnici,
    filterIme,
    filterOib,
    filterAktivan,
    filterRadnoMjesto,
    samoUpozorenja,
    pregledi,
    osposobljavanja,
  ]);

  const spremiRadnika = async () => {
    if (!firmaId) {
      alert("Nedostaje ID tvrtke.");
      return;
    }

    if (
      !forma.ime.trim() ||
      !forma.oib.trim() ||
      !forma.datumZaposlenja.trim()
    ) {
      alert("Unesi ime i prezime, OIB i početak rada.");
      return;
    }

    if (!forma.aktivan && !forma.datumOdjave.trim()) {
      alert("Ako radnik nije aktivan, unesi datum odjave.");
      return;
    }

    const datumZaposlenja = parseDate(forma.datumZaposlenja);
    const datumRodjenja = parseDate(forma.datumRodjenja);
    const datumOdjave = parseDate(forma.datumOdjave);
    const dozvolaDo = parseDate(forma.dozvolaDo);
    const znrDatum = parseDate(forma.znrDatum);
    const zopDatum = parseDate(forma.zopDatum);

    if (!datumZaposlenja) {
      alert("Početak rada mora biti u obliku dd.mm.gggg");
      return;
    }

    if (forma.datumRodjenja && !datumRodjenja) {
      alert("Datum rođenja mora biti u obliku dd.mm.gggg");
      return;
    }

    if (!forma.aktivan && forma.datumOdjave && !datumOdjave) {
      alert("Datum odjave mora biti u obliku dd.mm.gggg");
      return;
    }

    if (forma.imaDozvolu && forma.dozvolaDo && !dozvolaDo) {
      alert("Datum radne dozvole mora biti u obliku dd.mm.gggg");
      return;
    }

    if (forma.znrOsposobljen && forma.znrDatum && !znrDatum) {
      alert("Datum ZNR mora biti u obliku dd.mm.gggg");
      return;
    }

    if (forma.zopOsposobljen && forma.zopDatum && !zopDatum) {
      alert("Datum ZOP mora biti u obliku dd.mm.gggg");
      return;
    }

    const payload = {
      firmaId,
      ime: forma.ime.trim(),
      oib: forma.oib.trim(),
      aktivan: forma.aktivan,
      datumOdjave: forma.aktivan ? null : datumOdjave || null,
      datumZaposlenja,
      datumRodjenja: datumRodjenja || null,
      grad: forma.grad.trim() || null,
      radnoMjesto: forma.radnoMjesto.trim() || null,
      imaDozvolu: forma.imaDozvolu,
      dozvolaDo: forma.imaDozvolu ? dozvolaDo || null : null,
      znrOsposobljen: forma.znrOsposobljen,
      znrDatum: forma.znrOsposobljen ? znrDatum || null : null,
      zopOsposobljen: forma.zopOsposobljen,
      zopDatum: forma.zopOsposobljen ? zopDatum || null : null,
    };

    try {
      setSpremanje(true);
      setGreska("");

      const res = await fetch(
        editId ? `/api/radnici/${editId}` : "/api/radnici",
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
        throw new Error(text || "Ne mogu spremiti radnika.");
      }

      setForma(prazni);
      setEditId(null);
      await ucitajSve();
    } catch (err) {
      setGreska(
        err instanceof Error ? err.message : "Greška pri spremanju."
      );
    } finally {
      setSpremanje(false);
    }
  };

  const pokreniUredenje = (radnik: Radnik) => {
    setForma({
      ime: radnik.ime,
      oib: radnik.oib,
      aktivan: radnik.aktivan,
      datumOdjave: formatDate(radnik.datumOdjave) === "-" ? "" : formatDate(radnik.datumOdjave),
      datumZaposlenja:
        formatDate(radnik.datumZaposlenja) === "-"
          ? ""
          : formatDate(radnik.datumZaposlenja),
      datumRodjenja:
        formatDate(radnik.datumRodjenja) === "-"
          ? ""
          : formatDate(radnik.datumRodjenja),
      grad: radnik.grad || "",
      radnoMjesto: radnik.radnoMjesto || "",
      imaDozvolu: radnik.imaDozvolu,
      dozvolaDo:
        formatDate(radnik.dozvolaDo) === "-" ? "" : formatDate(radnik.dozvolaDo),
      znrOsposobljen: radnik.znrOsposobljen,
      znrDatum:
        formatDate(radnik.znrDatum) === "-" ? "" : formatDate(radnik.znrDatum),
      zopOsposobljen: radnik.zopOsposobljen,
      zopDatum:
        formatDate(radnik.zopDatum) === "-" ? "" : formatDate(radnik.zopDatum),
    });

    setEditId(radnik.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const odustani = () => {
    setForma(prazni);
    setEditId(null);
  };

  const obrisiRadnika = async (id: string) => {
    if (!confirm("Obrisati radnika?")) return;

    try {
      setGreska("");

      const res = await fetch(`/api/radnici/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati radnika.");
      }

      if (detalji?.id === id) {
        setDetalji(null);
      }

      if (editId === id) {
        odustani();
      }

      await ucitajSve();
    } catch (err) {
      setGreska(
        err instanceof Error ? err.message : "Greška pri brisanju."
      );
    }
  };

  const preglediRadnika = useMemo(() => {
    if (!detalji) return [];
    return pregledi.filter((p) => p.oib === detalji.oib);
  }, [detalji, pregledi]);

  const osposobljavanjaRadnika = useMemo(() => {
    if (!detalji) return [];
    return osposobljavanja.filter((o) => o.oib === detalji.oib);
  }, [detalji, osposobljavanja]);

  const brojAktivnih = useMemo(
    () => radnici.filter((r) => r.aktivan).length,
    [radnici]
  );

  const brojNeaktivnih = useMemo(
    () => radnici.filter((r) => !r.aktivan).length,
    [radnici]
  );

  const brojUpozorenja = useMemo(
    () => radnici.filter((r) => imaUpozorenje(r)).length,
    [radnici, pregledi, osposobljavanja]
  );

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
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
              Greška
            </h1>
            <div>{greska}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={heroCardStyle}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
              Tvrtka nije pronađena
            </h1>
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
          <div style={heroTopStyle}>
            <div>
              <div style={heroBadgeStyle}>Modul</div>
              <h1 style={heroTitleStyle}>Radnici</h1>
              <div style={heroTextStyle}>
                <strong>Tvrtka:</strong> {tvrtka.naziv}
              </div>
            </div>

            <div style={heroInfoCardStyle}>
              <div style={heroInfoLabelStyle}>Ukupno radnika</div>
              <div style={heroInfoValueStyle}>{radnici.length}</div>
            </div>
          </div>

          <div style={statsMiniGridStyle}>
            <MiniStat label="Aktivni" value={brojAktivnih} />
            <MiniStat label="Neaktivni" value={brojNeaktivnih} />
            <MiniStat label="S upozorenjima" value={brojUpozorenja} alert />
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Uvoz radnika iz CSV-a</h2>

          <div style={helperTextStyle}>
            CSV treba imati barem stupce:
            <strong> Ime i prezime</strong>, <strong>OIB</strong>,
            <strong> Početak rada</strong>.
            Može imati i ostala polja.
          </div>

          <div style={uploadGridStyle}>
            <div>
              <label style={labelStyle}>Odaberi CSV file</label>
              <input
                ref={fileInputRef}
                type="file"
                
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
              {upozorenja.map((u, i) => (
                <div
                  key={i}
                  style={{
                    ...warningItemStyle,
                    ...(u.level === "expired"
                      ? expiredCardStyle
                      : warningCardStyle),
                  }}
                >
                  <strong>{u.tip}</strong> — {u.ime} — {u.datum} — {u.status}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Filteri i pretraga</h2>

          <div style={filterGridStyle}>
            <div>
              <label style={labelStyle}>Ime i prezime</label>
              <input
                style={inputStyle}
                value={filterIme}
                onChange={(e) => setFilterIme(e.target.value)}
                placeholder="Pretraga po imenu"
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
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
                value={filterAktivan}
                onChange={(e) => setFilterAktivan(e.target.value)}
              >
                <option value="svi">Svi</option>
                <option value="aktivni">Samo aktivni</option>
                <option value="neaktivni">Samo neaktivni</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Radno mjesto</label>
              <input
                style={inputStyle}
                value={filterRadnoMjesto}
                onChange={(e) => setFilterRadnoMjesto(e.target.value)}
                placeholder="Pretraga po radnom mjestu"
              />
            </div>

            <div>
              <label style={labelStyle}>Samo upozorenja</label>
              <div style={checkboxWrapStyle}>
                <input
                  type="checkbox"
                  checked={samoUpozorenja}
                  onChange={(e) =>
                    setSamoUpozorenja(e.target.checked)
                  }
                />
                <span>Prikaži samo radnike s upozorenjima</span>
              </div>
            </div>
          </div>

          <div style={actionRowStyle}>
            <button
              style={grayButtonStyle}
              onClick={() => {
                setFilterIme("");
                setFilterOib("");
                setFilterAktivan("svi");
                setFilterRadnoMjesto("");
                setSamoUpozorenja(false);
              }}
            >
              Očisti filtere
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>
            {editId ? "Uređenje radnika" : "Unos radnika"}
          </h2>

          <div style={formGridStyle}>
            <Field label="Ime i prezime">
              <input
                style={inputStyle}
                value={forma.ime}
                onChange={(e) =>
                  setForma({ ...forma, ime: e.target.value })
                }
              />
            </Field>

            <Field label="OIB">
              <input
                style={inputStyle}
                value={forma.oib}
                onChange={(e) =>
                  setForma({ ...forma, oib: e.target.value })
                }
              />
            </Field>

            <Field label="Početak rada">
              <input
                style={inputStyle}
                value={forma.datumZaposlenja}
                onChange={(e) =>
                  setForma({
                    ...forma,
                    datumZaposlenja: e.target.value,
                  })
                }
                placeholder="dd.mm.gggg"
              />
            </Field>

            <Field label="Datum rođenja">
              <input
                style={inputStyle}
                value={forma.datumRodjenja}
                onChange={(e) =>
                  setForma({
                    ...forma,
                    datumRodjenja: e.target.value,
                  })
                }
                placeholder="dd.mm.gggg"
              />
            </Field>

            <Field label="Grad / mjesto">
              <input
                style={inputStyle}
                value={forma.grad}
                onChange={(e) =>
                  setForma({ ...forma, grad: e.target.value })
                }
              />
            </Field>

            <Field label="Radno mjesto">
              <input
                style={inputStyle}
                value={forma.radnoMjesto}
                onChange={(e) =>
                  setForma({
                    ...forma,
                    radnoMjesto: e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Aktivan">
              <select
                style={inputStyle}
                value={forma.aktivan ? "da" : "ne"}
                onChange={(e) =>
                  setForma({
                    ...forma,
                    aktivan: e.target.value === "da",
                  })
                }
              >
                <option value="da">Da</option>
                <option value="ne">Ne</option>
              </select>
            </Field>

            {!forma.aktivan && (
              <Field label="Datum odjave">
                <input
                  style={inputStyle}
                  value={forma.datumOdjave}
                  onChange={(e) =>
                    setForma({
                      ...forma,
                      datumOdjave: e.target.value,
                    })
                  }
                  placeholder="dd.mm.gggg"
                />
              </Field>
            )}

            <Field label="Ima radnu dozvolu">
              <select
                style={inputStyle}
                value={forma.imaDozvolu ? "da" : "ne"}
                onChange={(e) =>
                  setForma({
                    ...forma,
                    imaDozvolu: e.target.value === "da",
                  })
                }
              >
                <option value="da">Da</option>
                <option value="ne">Ne</option>
              </select>
            </Field>

            {forma.imaDozvolu && (
              <Field label="Radna dozvola do">
                <input
                  style={inputStyle}
                  value={forma.dozvolaDo}
                  onChange={(e) =>
                    setForma({
                      ...forma,
                      dozvolaDo: e.target.value,
                    })
                  }
                  placeholder="dd.mm.gggg"
                />
              </Field>
            )}

            <Field label="Osposobljen iz zaštite na radu">
              <select
                style={inputStyle}
                value={forma.znrOsposobljen ? "da" : "ne"}
                onChange={(e) =>
                  setForma({
                    ...forma,
                    znrOsposobljen: e.target.value === "da",
                  })
                }
              >
                <option value="da">Da</option>
                <option value="ne">Ne</option>
              </select>
            </Field>

            {forma.znrOsposobljen && (
              <Field label="Datum ZNR osposobljavanja">
                <input
                  style={inputStyle}
                  value={forma.znrDatum}
                  onChange={(e) =>
                    setForma({
                      ...forma,
                      znrDatum: e.target.value,
                    })
                  }
                  placeholder="dd.mm.gggg"
                />
              </Field>
            )}

            <Field label="Osposobljen iz zaštite od požara">
              <select
                style={inputStyle}
                value={forma.zopOsposobljen ? "da" : "ne"}
                onChange={(e) =>
                  setForma({
                    ...forma,
                    zopOsposobljen: e.target.value === "da",
                  })
                }
              >
                <option value="da">Da</option>
                <option value="ne">Ne</option>
              </select>
            </Field>

            {forma.zopOsposobljen && (
              <Field label="Datum ZOP osposobljavanja">
                <input
                  style={inputStyle}
                  value={forma.zopDatum}
                  onChange={(e) =>
                    setForma({
                      ...forma,
                      zopDatum: e.target.value,
                    })
                  }
                  placeholder="dd.mm.gggg"
                />
              </Field>
            )}
          </div>

          <div style={actionRowStyle}>
            <button
              style={blackButtonStyle}
              onClick={spremiRadnika}
              disabled={spremanje}
            >
              {spremanje
                ? "Spremanje..."
                : editId
                ? "Spremi izmjene"
                : "Dodaj radnika"}
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
        Popis radnika
      </h2>
      <div style={sectionSubtitleStyle}>
        Pregled svih zapisa za ovu tvrtku.
      </div>
    </div>

    <button style={grayButtonStyle} onClick={exportRadniciCsv}>
      Izvoz CSV
    </button>
  </div>

  <button
    style={smallRedButtonStyle}
    onClick={async () => {
      if (!confirm("Obrisati SVE radnike ove tvrtke?")) return;

      await fetch(`/api/radnici?firmaId=${firmaId}`, {
        method: "DELETE",
      });

      await ucitajSve();
    }}
  >
    Obriši sve radnike
  </button>

  <div className="desktop-only">
    <div style={tableWrapStyle}>
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: "#f9fafb" }}>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Ime i prezime</th>
            <th style={thStyle}>OIB</th>
            <th style={thStyle}>Početak rada</th>
            <th style={thStyle}>Radno mjesto</th>
            <th style={thStyle}>Dozvola</th>
            <th style={thStyle}>Akcije</th>
          </tr>
        </thead>

        <tbody>
          {filtriraniRadnici.length === 0 ? (
            <tr>
              <td colSpan={7} style={tdCenterStyle}>
                Nema radnika za prikaz.
              </td>
            </tr>
          ) : (
            filtriraniRadnici.map((r) => (
              <tr key={r.id}>
                <td style={tdStyle}>
                  <span
                    style={{
                      ...pillStyle,
                      ...(r.aktivan ? activePillStyle : inactivePillStyle),
                    }}
                  >
                    {r.aktivan ? "Aktivan" : "Neaktivan"}
                  </span>
                </td>

                <td style={tdStyle}>
                  <Link
                    href={`/tvrtke/${firmaId}/radnici/${r.id}`}
                    style={{
                      color: "#2563eb",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    {r.ime}
                  </Link>
                </td>

                <td style={tdStyle}>{r.oib}</td>
                <td style={tdStyle}>{formatDate(r.datumZaposlenja)}</td>
                <td style={tdStyle}>{r.radnoMjesto || "-"}</td>

                <td style={tdStyle}>
                  {r.imaDozvolu ? (
                    <span style={{ ...pillStyle, ...badgeStyle(r.dozvolaDo) }}>
                      {statusRoka(r.dozvolaDo).text}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>

                <td style={tdStyle}>
                  <div style={tableActionsStyle}>
                    <button
                      style={smallDarkButtonStyle}
                      onClick={() => setDetalji(r)}
                    >
                      Detalji
                    </button>

                    <button
                      style={smallGrayButtonStyle}
                      onClick={() => pokreniUredenje(r)}
                    >
                      Uredi
                    </button>

                    <button
                      style={smallRedButtonStyle}
                      onClick={() => obrisiRadnika(r.id)}
                    >
                      Obriši
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>

  <div className="mobile-only">
    <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
      {filtriraniRadnici.length === 0 ? (
        <div style={tdCenterStyle}>Nema radnika za prikaz.</div>
      ) : (
        filtriraniRadnici.map((r) => (
          <div
            key={r.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 14,
              background: "#fff",
              boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {r.ime}
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  OIB: {r.oib}
                </div>
              </div>

              <span
                style={{
                  ...pillStyle,
                  ...(r.aktivan ? activePillStyle : inactivePillStyle),
                }}
              >
                {r.aktivan ? "Aktivan" : "Neaktivan"}
              </span>
            </div>

            <div style={{ marginTop: 10, fontSize: 14 }}>
              <div>
                <b>Početak rada:</b> {formatDate(r.datumZaposlenja)}
              </div>
              <div>
                <b>Radno mjesto:</b> {r.radnoMjesto || "-"}
              </div>
              <div>
                <b>Dozvola:</b> {r.imaDozvolu ? "Da" : "Ne"}
              </div>
            </div>

            <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
              <button style={smallDarkButtonStyle} onClick={() => setDetalji(r)}>
                Detalji
              </button>

              <button style={smallGrayButtonStyle} onClick={() => pokreniUredenje(r)}>
                Uredi
              </button>

              <button style={smallRedButtonStyle} onClick={() => obrisiRadnika(r.id)}>
                Obriši
              </button>
            </div>
          </div>
        ))
      )}
    </div>
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
                  <h2 style={modalTitleStyle}>Detalji radnika</h2>
                  <div style={modalSubtitleStyle}>{detalji.ime}</div>
                </div>
                <button
                  style={smallGrayButtonStyle}
                  onClick={() => setDetalji(null)}
                >
                  Zatvori
                </button>
              </div>

              <div style={detailGridStyle}>
                <div style={detailSectionStyle}>
                  <h3 style={detailSectionTitleStyle}>Osnovni podaci</h3>
                  <Detalj red="Ime i prezime" value={detalji.ime} />
                  <Detalj red="OIB" value={detalji.oib} />
                  <Detalj
                    red="Aktivan"
                    value={detalji.aktivan ? "Da" : "Ne"}
                  />
                  <Detalj
                    red="Datum odjave"
                    value={
                      detalji.aktivan
                        ? "-"
                        : formatDate(detalji.datumOdjave)
                    }
                  />
                  <Detalj
                    red="Početak rada"
                    value={formatDate(detalji.datumZaposlenja)}
                  />
                  <Detalj
                    red="Datum rođenja"
                    value={formatDate(detalji.datumRodjenja)}
                  />
                  <Detalj red="Grad / mjesto" value={detalji.grad || "-"} />
                  <Detalj
                    red="Radno mjesto"
                    value={detalji.radnoMjesto || "-"}
                  />
                </div>

                <div style={detailSectionStyle}>
                  <h3 style={detailSectionTitleStyle}>Statusi</h3>
                  <Detalj
                    red="Ima radnu dozvolu"
                    value={detalji.imaDozvolu ? "Da" : "Ne"}
                  />
                  <Detalj
                    red="Radna dozvola do"
                    value={
                      detalji.imaDozvolu
                        ? formatDate(detalji.dozvolaDo)
                        : "-"
                    }
                  />
                  {detalji.imaDozvolu && (
                    <StatusBadge
                      title="Status dozvole"
                      text={statusRoka(detalji.dozvolaDo).text}
                      styleObj={badgeStyle(detalji.dozvolaDo)}
                    />
                  )}

                  <div style={{ height: 12 }} />

                  <Detalj
                    red="ZNR osposobljen"
                    value={detalji.znrOsposobljen ? "Da" : "Ne"}
                  />
                  <Detalj
                    red="Datum ZNR"
                    value={
                      detalji.znrOsposobljen
                        ? formatDate(detalji.znrDatum)
                        : "-"
                    }
                  />

                  <div style={{ height: 12 }} />

                  <Detalj
                    red="ZOP osposobljen"
                    value={detalji.zopOsposobljen ? "Da" : "Ne"}
                  />
                  <Detalj
                    red="Datum ZOP"
                    value={
                      detalji.zopOsposobljen
                        ? formatDate(detalji.zopDatum)
                        : "-"
                    }
                  />
                </div>
              </div>

              <div style={{ ...detailSectionStyle, marginBottom: 20 }}>
                <h3 style={detailSectionTitleStyle}>Liječnički pregledi</h3>

                {preglediRadnika.length === 0 ? (
                  <div>Nema evidentiranih liječničkih pregleda.</div>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          <th style={thStyle}>Vrsta</th>
                          <th style={thStyle}>Datum</th>
                          <th style={thStyle}>Vrijedi do</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}>Napomena</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preglediRadnika.map((p) => (
                          <tr key={p.id}>
                            <td style={tdStyle}>{p.vrsta || "-"}</td>
                            <td style={tdStyle}>{formatDate(p.datum)}</td>
                            <td style={tdStyle}>{formatDate(p.vrijediDo)}</td>
                            <td style={tdStyle}>
                              <span
                                style={{
                                  ...pillStyle,
                                  ...badgeStyle(p.vrijediDo),
                                }}
                              >
                                {statusRoka(p.vrijediDo).text}
                              </span>
                            </td>
                            <td style={tdStyle}>{p.napomena || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={detailSectionStyle}>
                <h3 style={detailSectionTitleStyle}>
                  Stručna osposobljavanja
                </h3>

                {osposobljavanjaRadnika.length === 0 ? (
                  <div>Nema evidentiranih stručnih osposobljavanja.</div>
                ) : (
                  <div style={tableWrapStyle}>
                    <table style={tableStyle}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          <th style={thStyle}>Vrsta</th>
                          <th style={thStyle}>Datum</th>
                          <th style={thStyle}>Vrijedi do</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}>Napomena</th>
                        </tr>
                      </thead>
                      <tbody>
                        {osposobljavanjaRadnika.map((o) => (
                          <tr key={o.id}>
                            <td style={tdStyle}>{o.vrsta}</td>
                            <td style={tdStyle}>{formatDate(o.datum)}</td>
                            <td style={tdStyle}>{formatDate(o.vrijediDo)}</td>
                            <td style={tdStyle}>
                              <span
                                style={{
                                  ...pillStyle,
                                  ...badgeStyle(o.vrijediDo),
                                }}
                              >
                                {statusRoka(o.vrijediDo).text}
                              </span>
                            </td>
                            <td style={tdStyle}>{o.napomena || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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

function StatusBadge({
  title,
  text,
  styleObj,
}: {
  title: string;
  text: string;
  styleObj: React.CSSProperties;
}) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#111827" }}>
        {title}
      </div>
      <div
        style={{
          display: "inline-block",
          padding: "6px 10px",
          borderRadius: 999,
          ...styleObj,
        }}
      >
        {text}
      </div>
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
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
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

const checkboxWrapStyle: React.CSSProperties = {
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#374151",
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
  minWidth: 900,
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

const activePillStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #4ade80",
};

const inactivePillStyle: React.CSSProperties = {
  background: "#f3f4f6",
  color: "#374151",
  border: "1px solid #d1d5db",
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
  maxWidth: 1050,
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

const detailGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginBottom: 20,
};

const detailSectionStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
};

const detailSectionTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  marginTop: 0,
  marginBottom: 12,
  color: "#111827",
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