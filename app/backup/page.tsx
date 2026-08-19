"use client";

import { useEffect, useState } from "react";

type Tvrtka = {
  id: string;
  naziv: string;
  oib: string;
};

function fileNameFromResponse(res: Response, fallback: string) {
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/);
  return match?.[1] || fallback;
}

async function downloadBackup(url: string, fallbackFileName: string) {
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Ne mogu napraviti backup.");
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileNameFromResponse(res, fallbackFileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function BackupPage() {
  const [tvrtke, setTvrtke] = useState<Tvrtka[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");

  useEffect(() => {
    let active = true;

    async function ucitajTvrtke() {
      try {
        const res = await fetch("/api/tvrtke", { cache: "no-store" });
        if (!res.ok) throw new Error("Ne mogu učitati tvrtke.");
        const data = await res.json();
        if (active) setTvrtke(data);
      } catch (err) {
        if (active) {
          setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    ucitajTvrtke();

    return () => {
      active = false;
    };
  }, []);

  const preuzmiSve = async () => {
    try {
      setWorking("all");
      setGreska("");
      setPoruka("");
      await downloadBackup("/api/backup", "znr-backup.json");
      setPoruka("Backup cijele aplikacije je preuzet.");
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri backupu.");
    } finally {
      setWorking(null);
    }
  };

  const preuzmiTvrtku = async (tvrtka: Tvrtka) => {
    try {
      setWorking(tvrtka.id);
      setGreska("");
      setPoruka("");
      await downloadBackup(`/api/backup?firmaId=${tvrtka.id}`, `znr-backup-tvrtka-${tvrtka.oib}.json`);
      setPoruka(`Backup za ${tvrtka.naziv} je preuzet.`);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri backupu.");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <div style={badgeStyle}>Sigurnosna kopija</div>
          <h1 style={titleStyle}>Backup podataka</h1>
          <p style={leadStyle}>
            Preuzmi sigurnosnu kopiju cijele aplikacije ili samo jedne firme.
          </p>
        </div>
        <button
          type="button"
          onClick={preuzmiSve}
          disabled={working !== null}
          style={primaryButtonStyle}
        >
          {working === "all" ? "Pripremam backup..." : "Preuzmi sve podatke"}
        </button>
      </div>

      {greska ? <div style={errorStyle}>{greska}</div> : null}
      {poruka ? <div style={successStyle}>{poruka}</div> : null}

      <div style={cardStyle}>
        <div style={sectionTopStyle}>
          <div>
            <h2 style={sectionTitleStyle}>Backup po firmi</h2>
            <div style={mutedStyle}>Ukupno firmi: {tvrtke.length}</div>
          </div>
        </div>

        {loading ? (
          <div style={emptyStyle}>Učitavanje...</div>
        ) : tvrtke.length === 0 ? (
          <div style={emptyStyle}>Nema firmi za prikaz.</div>
        ) : (
          <div style={listStyle}>
            {tvrtke.map((tvrtka) => (
              <div key={tvrtka.id} style={rowStyle}>
                <div>
                  <div style={companyNameStyle}>{tvrtka.naziv}</div>
                  <div style={mutedStyle}>OIB: {tvrtka.oib}</div>
                </div>
                <button
                  type="button"
                  onClick={() => preuzmiTvrtku(tvrtka)}
                  disabled={working !== null}
                  style={secondaryButtonStyle}
                >
                  {working === tvrtka.id ? "Pripremam..." : "Preuzmi backup"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const headerStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 22,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#dbeafe",
  color: "#1e3a8a",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 10,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 30,
  fontWeight: 900,
};

const leadStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#475569",
  fontSize: 15,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 22,
};

const sectionTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 900,
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 14,
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const rowStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const companyNameStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 3,
};

const primaryButtonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  background: "#0f2747",
  color: "white",
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f172a",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
  fontWeight: 700,
};

const successStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  fontWeight: 700,
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 12,
  background: "#f8fafc",
  color: "#64748b",
};