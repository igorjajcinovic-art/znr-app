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
  ukupnoMin: number;
  status: string;
  napomena: string | null;
};

type DayInfo = {
  iso: string;
  day: number;
  weekday: string;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName: string;
};

type CellDraft = {
  radnikId: string;
  datum: string;
  pocetak: string;
  kraj: string;
  status: string;
  napomena: string;
};

const DEFAULT_START = "06:00";
const DEFAULT_END = "14:00";
const DEFAULT_DAY_MINUTES = 8 * 60;
const WEEKDAYS = ["ned", "pon", "uto", "sri", "cet", "pet", "sub"];
const ABSENCE_STATUSES = ["godisnji", "bolovanje", "neopravdano"];

function todayMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

function localIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function easterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function croatianHolidays(year: number) {
  const easter = easterDate(year);
  const holidays = new Map<string, string>();

  [
    ["01-01", "Nova godina"],
    ["01-06", "Sveta tri kralja"],
    ["05-01", "Praznik rada"],
    ["05-30", "Dan drzavnosti"],
    ["06-22", "Dan antifasisticke borbe"],
    ["08-05", "Dan pobjede"],
    ["08-15", "Velika Gospa"],
    ["11-01", "Svi sveti"],
    ["11-18", "Dan sjecanja"],
    ["12-25", "Bozic"],
    ["12-26", "Sveti Stjepan"],
  ].forEach(([date, name]) => holidays.set(`${year}-${date}`, name));

  holidays.set(localIso(easter), "Uskrs");
  holidays.set(localIso(addDays(easter, 1)), "Uskrsni ponedjeljak");
  holidays.set(localIso(addDays(easter, 60)), "Tijelovo");

  return holidays;
}

function monthDays(month: string): DayInfo[] {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const holidays = croatianHolidays(year);

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1);
    const iso = localIso(date);
    const holidayName = holidays.get(iso) || "";

    return {
      iso,
      day: index + 1,
      weekday: WEEKDAYS[date.getDay()],
      isSunday: date.getDay() === 0,
      isHoliday: Boolean(holidayName),
      holidayName,
    };
  });
}

function cellKey(radnikId: string, datum: string) {
  return `${radnikId}|${datum}`;
}

function toInputDate(value: string | null) {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0];
  return value;
}

function parseMinutes(value: string) {
  const match = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function calculateMinutes(pocetak: string, kraj: string) {
  const start = parseMinutes(pocetak);
  const end = parseMinutes(kraj);
  if (start === null || end === null) return 0;
  return end >= start ? end - start : end + 24 * 60 - start;
}

function formatMinutes(minutes: number) {
  const safe = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

function isAbsenceStatus(status: string) {
  return ABSENCE_STATUSES.includes(status);
}

function absenceCode(status: string) {
  if (status === "godisnji") return "GO";
  if (status === "bolovanje") return "BO";
  if (status === "neopravdano") return "NO";
  return "";
}

function absenceHours(status: string) {
  return isAbsenceStatus(status)
    ? Number((DEFAULT_DAY_MINUTES / 60).toFixed(2))
    : 0;
}

function monthTitle(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${monthNumber}/${year}`;
}

function safeSheetName(value: string, index: number) {
  const clean = value.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 24);
  return `${index + 1}. ${clean || "Radnik"}`.slice(0, 31);
}

function csvEscape(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export default function RadnoVrijemePage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const firmaId = String(firmaIdRaw ?? "");

  const [tvrtka, setTvrtka] = useState<Tvrtka | null>(null);
  const [radnici, setRadnici] = useState<Radnik[]>([]);
  const [zapisi, setZapisi] = useState<RadnoVrijeme[]>([]);
  const [mjesec, setMjesec] = useState(todayMonth());
  const [filterRadnik, setFilterRadnik] = useState("");
  const [drafts, setDrafts] = useState<Record<string, CellDraft>>({});
  const [ucitavanje, setUcitavanje] = useState(true);
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");

  useEffect(() => {
    if (!firmaId) return;
    ucitajSve();
  }, [firmaId]);

  useEffect(() => {
    setDrafts({});
    setPoruka("");
  }, [mjesec]);

  const ucitajSve = async () => {
    try {
      setUcitavanje(true);
      setGreska("");
      setPoruka("");

      const [tvrtkeRes, radniciRes, vrijemeRes] = await Promise.all([
        fetch("/api/tvrtke", { cache: "no-store" }),
        fetch(`/api/radnici?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
        fetch(`/api/radno-vrijeme?firmaId=${encodeURIComponent(firmaId)}`, {
          cache: "no-store",
        }),
      ]);

      if (!tvrtkeRes.ok) throw new Error("Ne mogu ucitati tvrtku.");
      if (!radniciRes.ok) throw new Error("Ne mogu ucitati radnike.");
      if (!vrijemeRes.ok) {
        throw new Error("Ne mogu ucitati evidenciju radnog vremena.");
      }

      const sveTvrtke: Tvrtka[] = await tvrtkeRes.json();
      const radniciData: Radnik[] = await radniciRes.json();
      const vrijemeData: RadnoVrijeme[] = await vrijemeRes.json();
      const nadenaTvrtka = sveTvrtke.find((t) => t.id === firmaId) || null;

      if (!nadenaTvrtka) throw new Error("Tvrtka nije pronadena.");

      setTvrtka(nadenaTvrtka);
      setRadnici(radniciData);
      setZapisi(vrijemeData);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greska pri ucitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const dani = useMemo(() => monthDays(mjesec), [mjesec]);

  const aktivniRadnici = useMemo(
    () =>
      radnici
        .filter((radnik) => radnik.aktivan)
        .sort((a, b) => a.ime.localeCompare(b.ime, "hr")),
    [radnici]
  );

  const prikazaniRadnici = useMemo(() => {
    const needle = filterRadnik.trim().toLowerCase();
    if (!needle) return aktivniRadnici;

    return aktivniRadnici.filter(
      (radnik) =>
        radnik.ime.toLowerCase().includes(needle) || radnik.oib.includes(needle)
    );
  }, [aktivniRadnici, filterRadnik]);

  const radnikPoId = useMemo(
    () => new Map(radnici.map((radnik) => [radnik.id, radnik])),
    [radnici]
  );

  const radnikPoOib = useMemo(
    () => new Map(radnici.map((radnik) => [radnik.oib, radnik])),
    [radnici]
  );

  const zapisiPoCeliji = useMemo(() => {
    const map = new Map<string, RadnoVrijeme>();

    zapisi.forEach((zapis) => {
      const radnik =
        (zapis.radnikId ? radnikPoId.get(zapis.radnikId) : null) ||
        radnikPoOib.get(zapis.oib);
      const datum = toInputDate(zapis.datum);

      if (!radnik || !datum.startsWith(mjesec)) return;
      map.set(cellKey(radnik.id, datum), zapis);
    });

    return map;
  }, [zapisi, radnikPoId, radnikPoOib, mjesec]);

  const getCellValue = (radnikId: string, day: DayInfo) => {
    const key = cellKey(radnikId, day.iso);
    const draft = drafts[key];
    const existing = zapisiPoCeliji.get(key);

    if (draft) {
      return {
        pocetak: draft.pocetak,
        kraj: draft.kraj,
        napomena: draft.napomena,
        status: draft.status,
        source: "draft" as const,
      };
    }

    if (existing) {
      return {
        pocetak: existing.pocetak,
        kraj: existing.kraj,
        napomena: existing.napomena || "",
        status: existing.status || "evidentirano",
        source: "saved" as const,
      };
    }

    if (!day.isSunday && !day.isHoliday) {
      return {
        pocetak: DEFAULT_START,
        kraj: DEFAULT_END,
        napomena: "",
        status: "evidentirano",
        source: "suggested" as const,
      };
    }

    return {
      pocetak: "",
      kraj: "",
      napomena: "",
      status: "evidentirano",
      source: "empty" as const,
    };
  };

  const updateCell = (
    radnikId: string,
    day: DayInfo,
    field: "pocetak" | "kraj" | "napomena" | "status",
    value: string
  ) => {
    const key = cellKey(radnikId, day.iso);
    const current = getCellValue(radnikId, day);

    setDrafts((prev) => ({
      ...prev,
      [key]: {
        radnikId,
        datum: day.iso,
        pocetak: field === "pocetak" ? value : current.pocetak,
        kraj: field === "kraj" ? value : current.kraj,
        status: field === "status" ? value : current.status,
        napomena: field === "napomena" ? value : current.napomena,
      },
    }));
  };

  const updateDayStatus = (radnikId: string, day: DayInfo, status: string) => {
    const key = cellKey(radnikId, day.iso);
    const current = getCellValue(radnikId, day);
    const absence = isAbsenceStatus(status);

    setDrafts((prev) => ({
      ...prev,
      [key]: {
        radnikId,
        datum: day.iso,
        pocetak: absence ? "" : current.pocetak || DEFAULT_START,
        kraj: absence ? "" : current.kraj || DEFAULT_END,
        status: status || "evidentirano",
        napomena: current.napomena,
      },
    }));
  };

  const clearCell = (radnikId: string, day: DayInfo) => {
    const key = cellKey(radnikId, day.iso);
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        radnikId,
        datum: day.iso,
        pocetak: "",
        kraj: "",
        status: "evidentirano",
        napomena: "",
      },
    }));
  };

  const popuniRadneDane = () => {
    setDrafts((prev) => {
      const next = { ...prev };

      prikazaniRadnici.forEach((radnik) => {
        dani.forEach((day) => {
          if (day.isSunday || day.isHoliday) return;

          const key = cellKey(radnik.id, day.iso);
          if (next[key] || zapisiPoCeliji.has(key)) return;

          next[key] = {
            radnikId: radnik.id,
            datum: day.iso,
            pocetak: DEFAULT_START,
            kraj: DEFAULT_END,
            status: "evidentirano",
            napomena: "",
          };
        });
      });

      return next;
    });
  };

  const rowTotal = (radnikId: string) =>
    dani.reduce((sum, day) => {
      const value = getCellValue(radnikId, day);
      if (!value.pocetak || !value.kraj) return sum;
      return sum + calculateMinutes(value.pocetak, value.kraj);
    }, 0);

  const mjesecTotal = prikazaniRadnici.reduce(
    (sum, radnik) => sum + rowTotal(radnik.id),
    0
  );

  const changedCount = Object.keys(drafts).length;

  const spremiIzmjene = async () => {
    const entries = Object.values(drafts);

    if (entries.length === 0) {
      setPoruka("Nema izmjena za spremanje.");
      return;
    }

    try {
      setSpremanje(true);
      setGreska("");
      setPoruka("");

      const res = await fetch("/api/radno-vrijeme/mjesec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmaId, entries }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu spremiti mjesecnu evidenciju.");
      }

      const result: { saved?: number; deleted?: number } = await res.json();
      setDrafts({});
      await ucitajSve();
      setPoruka(
        `Spremljeno: ${result.saved || 0}. Obrisano: ${result.deleted || 0}.`
      );
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greska pri spremanju.");
    } finally {
      setSpremanje(false);
    }
  };

  const exportRows = () =>
    prikazaniRadnici.map((radnik) => {
      const dayValues = dani.map((day) => {
        const value = getCellValue(radnik.id, day);
        const absence = absenceCode(value.status);
        if (absence) return absence;
        if (!value.pocetak || !value.kraj) return "";
        return `${value.pocetak}-${value.kraj} (${formatMinutes(
          calculateMinutes(value.pocetak, value.kraj)
        )})`;
      });

      return [
        radnik.ime,
        radnik.oib,
        ...dayValues,
        formatMinutes(rowTotal(radnik.id)),
      ];
    });

  const exportCsv = () => {
    const headers = [
      "Radnik",
      "OIB",
      ...dani.map((day) => `${day.day}.${day.weekday}`),
      "Ukupno",
    ];
    const csv = [
      headers.map(csvEscape).join(";"),
      ...exportRows().map((row) => row.map(csvEscape).join(";")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radno-vrijeme-${tvrtka?.naziv || "tvrtka"}-${mjesec}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const maxDays = 31;
    const categoryHeaders = [
      "Red. br. / Dan u mjesecu",
      "Pocetak rada (hh:mm)",
      "Zavrsetak rada (hh:mm)",
      "Ukupno dnevno vrijeme",
      "Od toga: redovan rad",
      "Od toga: rad nocu",
      "Od toga: sati prekovremenog rada",
      "Sati terenskog rada",
      "Sati rada nedjeljom, blagdanom ili neradnim danima",
      "Vrijeme i sati zastoja, prekida rada i sl.",
      "Sati u dane blagdana ili neradnih dana kada radnik ne radi",
      "Sati pripravnosti",
      "Sati koristenja godisnjeg odmora",
      "Sati koristenja tjednog odmora",
      "Sati koristenja dnevnog odmora",
      "Neradni dani i blagdani utvrdeni zakonom",
      "Sati privremene nesposob. za rad (bolovanje)",
      "Sati placenog dopusta i odsutnosti s rada",
      "Sati neplacenog dopusta",
      "Sati ocinskog dopusta i dopusta drugog posvojitelja",
      "Sati privremene nesposob. za rad (bolovanje)",
      "Sati nenazocnosti tijekom dnevnog rasporeda radnog vremena",
      "Sati nenazocnosti tijekom dnevnog rasporeda svojom krivnjom",
      "Sati nenazocnosti zbog vojne obveze ili sl. ugovornoj obvezi",
      "Sati provedeni u strajku",
      "Sati iskljucenja s rada (lockout)",
      "Napomena",
    ];

    prikazaniRadnici.forEach((radnik, index) => {
      const rows: (string | number)[][] = [
        ["EVIDENCIJA O RADNOM VREMENU"],
        ["Poslodavac:", tvrtka?.naziv || ""],
        ["OIB poslodavca:", tvrtka?.oib || ""],
        ["Adresa:", tvrtka?.adresa || ""],
        ["Ime i prezime radnika:", radnik.ime],
        ["OIB radnika:", radnik.oib],
        ["Mjesec i godina:", monthTitle(mjesec)],
        [],
        categoryHeaders,
      ];

      const totals = Array(categoryHeaders.length).fill(0) as number[];

      for (let dayNumber = 1; dayNumber <= maxDays; dayNumber += 1) {
        const day = dani[dayNumber - 1];
        const value = day
          ? getCellValue(radnik.id, day)
          : {
              pocetak: "",
              kraj: "",
              napomena: "",
              status: "evidentirano",
              source: "empty" as const,
            };
        const minutes =
          value.pocetak && value.kraj
            ? calculateMinutes(value.pocetak, value.kraj)
            : 0;
        const hours = Number((minutes / 60).toFixed(2));
        const absentHours = absenceHours(value.status);
        const isGodisnji = value.status === "godisnji";
        const isBolovanje = value.status === "bolovanje";
        const isNeopravdano = value.status === "neopravdano";
        const workedOnHoliday = Boolean(
          day && (day.isSunday || day.isHoliday) && hours > 0
        );
        const nonWorkingHoliday = Boolean(
          day &&
            (day.isSunday || day.isHoliday) &&
            hours === 0 &&
            !isAbsenceStatus(value.status)
        );

        const row = [
          dayNumber,
          isAbsenceStatus(value.status) ? "" : value.pocetak,
          isAbsenceStatus(value.status) ? "" : value.kraj,
          hours || "",
          workedOnHoliday ? "" : hours || "",
          "",
          "",
          "",
          workedOnHoliday ? hours : "",
          "",
          "",
          "",
          isGodisnji ? absentHours : "",
          "",
          "",
          nonWorkingHoliday ? 1 : "",
          isBolovanje ? absentHours : "",
          "",
          "",
          "",
          "",
          "",
          isNeopravdano ? absentHours : "",
          "",
          "",
          "",
          day?.holidayName || absenceCode(value.status) || value.napomena || "",
        ];

        row.forEach((cell, cellIndex) => {
          if (typeof cell === "number" && cellIndex > 2) {
            totals[cellIndex] += cell;
          }
        });

        rows.push(row);
      }

      rows.push([
        "UKUPNO",
        "",
        "",
        ...totals.slice(3).map((total) => (total ? Number(total.toFixed(2)) : 0)),
      ]);
      rows.push([]);
      rows.push(["Vlastorucnim potpisom potvrdujem pod materijalnom i kaznenom odgovornoscu da sam radio/la po gore evidentiranom radnom vremenu."]);
      rows.push(["Potpis radnika:", ""]);

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 10 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        ...Array.from({ length: 21 }, () => ({ wch: 18 })),
        { wch: 28 },
      ];
      worksheet["!rows"] = rows.map((_, rowIndex) => ({
        hpt: rowIndex === 8 ? 58 : 20,
      }));
      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: categoryHeaders.length - 1 } },
        { s: { r: 40, c: 0 }, e: { r: 40, c: categoryHeaders.length - 1 } },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        safeSheetName(radnik.ime, index)
      );
    });

    XLSX.writeFile(
      workbook,
      `radno-vrijeme-${tvrtka?.naziv || "tvrtka"}-${mjesec}.xlsx`
    );
  };

  if (ucitavanje) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Ucitavanje...</div>
      </div>
    );
  }

  if (!tvrtka) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>Tvrtka nije pronadena.</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/tvrtke/${firmaId}`} style={backLinkStyle}>
          &larr; Natrag na tvrtku
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
          <MiniStat label="Aktivnih radnika" value={aktivniRadnici.length} />
          <MiniStat label="Prikazano" value={prikazaniRadnici.length} />
          <MiniStat label="Ukupno sati" value={formatMinutes(mjesecTotal)} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={toolbarStyle}>
          <Field label="Mjesec">
            <input
              type="month"
              style={inputStyle}
              value={mjesec}
              onChange={(e) => setMjesec(e.target.value || todayMonth())}
            />
          </Field>

          <Field label="Radnik">
            <input
              style={inputStyle}
              value={filterRadnik}
              onChange={(e) => setFilterRadnik(e.target.value)}
              placeholder="Ime ili OIB"
            />
          </Field>

          <div style={toolbarActionsStyle}>
            <button style={secondaryButtonStyle} onClick={popuniRadneDane}>
              Popuni radne dane 06-14
            </button>
            <button
              style={primaryButtonStyle}
              onClick={spremiIzmjene}
              disabled={spremanje}
            >
              {spremanje ? "Spremanje..." : `Spremi izmjene (${changedCount})`}
            </button>
            <button style={secondaryButtonStyle} onClick={exportCsv}>
              Izvoz CSV
            </button>
            <button style={primaryButtonStyle} onClick={exportExcel}>
              Izvoz Excel
            </button>
          </div>
        </div>

        {greska ? <div style={errorStyle}>{greska}</div> : null}
        {poruka ? <div style={successStyle}>{poruka}</div> : null}

        <div style={legendStyle}>
          <span style={legendItemStyle}>
            <span style={{ ...legendDotStyle, background: "#e0f2fe" }} />{" "}
            Predlozeno radno vrijeme
          </span>
          <span style={legendItemStyle}>
            <span style={{ ...legendDotStyle, background: "#dcfce7" }} />{" "}
            Spremljeno
          </span>
          <span style={legendItemStyle}>
            <span style={{ ...legendDotStyle, background: "#fef3c7" }} />{" "}
            Nedjelja ili blagdan
          </span>
          <span style={legendItemStyle}>
            <span style={{ ...legendDotStyle, background: "#fce7f3" }} />{" "}
            GO / BO / NO
          </span>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={tableHeaderStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Mjesecni unos po radniku</h2>
            <p style={mutedStyle}>
              Za radne dane je ponudeno {DEFAULT_START}-{DEFAULT_END}. Nedjelje
              i blagdani su oznaceni, ali se mogu rucno upisati ako se radilo.
            </p>
          </div>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, ...stickyWorkerHeaderStyle }}>Radnik</th>
                {dani.map((day) => (
                  <th
                    key={day.iso}
                    title={day.holidayName || day.weekday}
                    style={{
                      ...thDayStyle,
                      ...(day.isSunday || day.isHoliday ? holidayHeaderStyle : {}),
                    }}
                  >
                    <div>{day.day}</div>
                    <small>{day.weekday}</small>
                  </th>
                ))}
                <th style={thTotalStyle}>Ukupno</th>
              </tr>
            </thead>
            <tbody>
              {prikazaniRadnici.length === 0 ? (
                <tr>
                  <td style={tdCenterStyle} colSpan={dani.length + 2}>
                    Nema aktivnih radnika za prikaz.
                  </td>
                </tr>
              ) : (
                prikazaniRadnici.map((radnik) => (
                  <tr key={radnik.id}>
                    <td style={{ ...tdStyle, ...stickyWorkerCellStyle }}>
                      <strong>{radnik.ime}</strong>
                      <div style={subTextStyle}>{radnik.oib}</div>
                    </td>
                    {dani.map((day) => {
                      const value = getCellValue(radnik.id, day);
                      const key = cellKey(radnik.id, day.iso);
                      const minutes =
                        value.pocetak && value.kraj
                          ? calculateMinutes(value.pocetak, value.kraj)
                          : 0;
                      const absence = absenceCode(value.status);

                      return (
                        <td
                          key={key}
                          style={{
                            ...tdDayStyle,
                            ...(day.isSunday || day.isHoliday
                              ? holidayCellStyle
                              : {}),
                            ...(value.source === "saved" ? savedCellStyle : {}),
                            ...(value.source === "suggested"
                              ? suggestedCellStyle
                              : {}),
                            ...(value.source === "draft" ? draftCellStyle : {}),
                            ...(absence ? absenceCellStyle : {}),
                          }}
                        >
                          <div style={cellInputsStyle}>
                            <input
                              type="time"
                              value={value.pocetak}
                              disabled={Boolean(absence)}
                              onChange={(e) =>
                                updateCell(
                                  radnik.id,
                                  day,
                                  "pocetak",
                                  e.target.value
                                )
                              }
                              style={timeInputStyle}
                              aria-label={`Pocetak ${radnik.ime} ${day.iso}`}
                            />
                            <input
                              type="time"
                              value={value.kraj}
                              disabled={Boolean(absence)}
                              onChange={(e) =>
                                updateCell(radnik.id, day, "kraj", e.target.value)
                              }
                              style={timeInputStyle}
                              aria-label={`Kraj ${radnik.ime} ${day.iso}`}
                            />
                            <select
                              value={isAbsenceStatus(value.status) ? value.status : ""}
                              onChange={(e) =>
                                updateDayStatus(radnik.id, day, e.target.value)
                              }
                              style={absenceSelectStyle}
                              aria-label={`Oznaka odsutnosti ${radnik.ime} ${day.iso}`}
                            >
                              <option value="">Rad</option>
                              <option value="godisnji">GO</option>
                              <option value="bolovanje">BO</option>
                              <option value="neopravdano">NO</option>
                            </select>
                          </div>
                          <div style={cellFooterStyle}>
                            <span>{absence || (minutes ? formatMinutes(minutes) : "-")}</span>
                            <div style={cellButtonsStyle}>
                              <label style={confirmLabelStyle} title="Potvrdi radno vrijeme">
                                <input
                                  type="checkbox"
                                  checked={value.status === "zakljuceno"}
                                  disabled={Boolean(absence)}
                                  onChange={(e) =>
                                    updateCell(
                                      radnik.id,
                                      day,
                                      "status",
                                      e.target.checked ? "zakljuceno" : "evidentirano"
                                    )
                                  }
                                />
                                <span>✓</span>
                              </label>
                              <button
                                type="button"
                                style={clearButtonStyle}
                                onClick={() => clearCell(radnik.id, day)}
                                title="Ocisti dan"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td style={tdTotalStyle}>
                      <strong>{formatMinutes(rowTotal(radnik.id))}</strong>
                    </td>
                  </tr>
                ))
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

const toolbarStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(170px, 220px) minmax(220px, 320px) 1fr",
  gap: 14,
  alignItems: "end",
};

const toolbarActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  justifyContent: "flex-end",
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

const successStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 8,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  fontWeight: 800,
};

const legendStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 14,
  marginTop: 14,
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

const legendItemStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const legendDotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: 999,
  border: "1px solid #cbd5e1",
};

const tableHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 20,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const tableWrapStyle: React.CSSProperties = {
  overflow: "auto",
  maxHeight: "70vh",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 2200,
  borderCollapse: "separate",
  borderSpacing: 0,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #e2e8f0",
  color: "#334155",
  fontSize: 13,
  background: "#f8fafc",
  position: "sticky",
  top: 0,
  zIndex: 2,
};

const thDayStyle: React.CSSProperties = {
  ...thStyle,
  width: 104,
  minWidth: 104,
  textAlign: "center",
};

const thTotalStyle: React.CSSProperties = {
  ...thStyle,
  width: 100,
  minWidth: 100,
  textAlign: "center",
  right: 0,
  zIndex: 3,
};

const stickyWorkerHeaderStyle: React.CSSProperties = {
  left: 0,
  zIndex: 4,
  minWidth: 230,
};

const stickyWorkerCellStyle: React.CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 1,
  background: "#ffffff",
  minWidth: 230,
};

const holidayHeaderStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
};

const tdStyle: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #eef2f7",
  borderRight: "1px solid #eef2f7",
  verticalAlign: "top",
  background: "#ffffff",
};

const tdDayStyle: React.CSSProperties = {
  ...tdStyle,
  width: 104,
  minWidth: 104,
  padding: 6,
};

const tdTotalStyle: React.CSSProperties = {
  ...tdStyle,
  position: "sticky",
  right: 0,
  zIndex: 1,
  minWidth: 100,
  textAlign: "center",
  background: "#f8fafc",
};

const tdCenterStyle: React.CSSProperties = {
  padding: 18,
  textAlign: "center",
  color: "#64748b",
};

const holidayCellStyle: React.CSSProperties = {
  background: "#fffbeb",
};

const savedCellStyle: React.CSSProperties = {
  background: "#dcfce7",
};

const suggestedCellStyle: React.CSSProperties = {
  background: "#e0f2fe",
};

const draftCellStyle: React.CSSProperties = {
  background: "#fef9c3",
};

const absenceCellStyle: React.CSSProperties = {
  background: "#fce7f3",
};

const subTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 12,
};

const cellInputsStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
};

const timeInputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 30,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "3px 4px",
  fontSize: 12,
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.78)",
};

const absenceSelectStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 28,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "3px 4px",
  fontSize: 12,
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.86)",
};

const cellFooterStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 4,
  marginTop: 4,
  color: "#334155",
  fontSize: 12,
  fontWeight: 900,
};

const cellButtonsStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const confirmLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  minWidth: 38,
  height: 20,
  padding: "0 4px",
  borderRadius: 999,
  background: "#dcfce7",
  color: "#166534",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
};

const clearButtonStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  border: "none",
  borderRadius: 999,
  background: "#e2e8f0",
  color: "#334155",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
};
