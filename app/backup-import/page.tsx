"use client";

import { useState } from "react";

const IMPORT_KEY = "znr-import-2026-08-19-privremeno";

const tableMap: Array<[string, string]> = [
  ["Tvrtka", "tvrtka"],
  ["Radnik", "radnici"],
  ["LijecnickiPregled", "lijecnicki"],
  ["StrucnoOsposobljavanje", "osposobljavanja"],
  ["Oprema", "oprema"],
  ["RadnaOprema", "radnaOprema"],
  ["RadnaOpremaDokument", "radnaOpremaDokumenti"],
  ["Planer", "planer"],
  ["RadnikDokument", "radnikDokumenti"],
  ["VatrogasniAparat", "vatrogasniAparati"],
  ["VatrogasniAparatPregled", "vatrogasniPregledi"],
  ["RadnoVrijeme", "radnoVrijeme"],
];

type BackupData = Record<string, unknown>;
type BackupFile = {
  tvrtka?: { naziv?: string };
  data?: BackupData;
};

type LogLine = {
  id: string;
  text: string;
  tone?: "ok" | "error";
};

function rowsFor(data: BackupData, keyName: string) {
  if (keyName === "tvrtka") return data.tvrtka ? [data.tvrtka] : [];
  const value = data[keyName];
  return Array.isArray(value) ? value : [];
}

async function postRows(table: string, rows: unknown[], addLog: (text: string) => void) {
  const batchSize = table === "RadnaOpremaDokument" || table === "RadnikDokument" ? 1 : table === "Radnik" ? 100 : 150;
  let imported = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch("/api/backup/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: IMPORT_KEY, table, rows: batch }),
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${table}: ${res.status} ${text}`);
    }

    const parsed = JSON.parse(text) as { ok?: boolean; imported?: number; error?: string };
    if (!parsed.ok) {
      throw new Error(`${table}: ${parsed.error || text}`);
    }

    imported += parsed.imported || 0;
    addLog(`${table}: ${imported}/${rows.length}`);
  }

  return imported;
}

export default function BackupImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);

  const addLog = (text: string, tone?: LogLine["tone"]) => {
    setLogs((current) => [
      ...current,
      { id: `${Date.now()}-${Math.random()}`, text, tone },
    ]);
  };

  const importFiles = async () => {
    if (!files.length || busy) return;
    setBusy(true);
    setLogs([]);

    try {
      for (const file of files) {
        const backup = JSON.parse(await file.text()) as BackupFile;
        const data = backup.data || {};
        const companyName = backup.tvrtka?.naziv || (data.tvrtka as { naziv?: string } | undefined)?.naziv || file.name;

        addLog(`Pocinjem: ${companyName}`);
        for (const [table, keyName] of tableMap) {
          const rows = rowsFor(data, keyName);
          if (!rows.length) {
            addLog(`${table}: 0`);
            continue;
          }
          await postRows(table, rows, addLog);
        }
        addLog(`Gotovo: ${companyName}`, "ok");
      }

      addLog("Svi backupi su uvezeni.", "ok");
    } catch (error) {
      addLog(error instanceof Error ? error.message : "Uvoz nije uspio.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div>
          <div style={eyebrowStyle}>Privremeni oporavak</div>
          <h1 style={titleStyle}>Uvoz backup podataka</h1>
          <p style={subtitleStyle}>
            Odaberi JSON backup datoteke firmi i pokreni uvoz u trenutnu online bazu.
          </p>
        </div>

        <input
          type="file"
          accept="application/json,.json"
          multiple
          disabled={busy}
          onChange={(event) => setFiles(Array.from(event.target.files || []))}
          style={inputStyle}
        />

        <div style={actionsStyle}>
          <button type="button" onClick={importFiles} disabled={!files.length || busy} style={buttonStyle}>
            {busy ? "Uvozim..." : "Uvezi backup"}
          </button>
          <span style={mutedStyle}>Odabrano datoteka: {files.length}</span>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={sectionTitleStyle}>Tijek uvoza</h2>
        <div style={logBoxStyle}>
          {logs.length ? (
            logs.map((line) => (
              <div
                key={line.id}
                style={{
                  ...logLineStyle,
                  ...(line.tone === "ok" ? okStyle : {}),
                  ...(line.tone === "error" ? errorStyle : {}),
                }}
              >
                {line.text}
              </div>
            ))
          ) : (
            <div style={mutedStyle}>Jos nije pokrenuto.</div>
          )}
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  padding: 24,
  display: "grid",
  gap: 16,
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 20,
  display: "grid",
  gap: 16,
};

const eyebrowStyle: React.CSSProperties = {
  color: "#0f766e",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "4px 0 6px",
  color: "#0f172a",
  fontSize: 30,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: 12,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 8,
  background: "#0f2747",
  color: "#ffffff",
  fontWeight: 900,
  padding: "11px 16px",
  cursor: "pointer",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#0f172a",
};

const logBoxStyle: React.CSSProperties = {
  minHeight: 220,
  maxHeight: 420,
  overflow: "auto",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 12,
};

const logLineStyle: React.CSSProperties = {
  padding: "5px 0",
  color: "#334155",
  fontFamily: "Consolas, monospace",
  fontSize: 13,
};

const okStyle: React.CSSProperties = {
  color: "#047857",
  fontWeight: 900,
};

const errorStyle: React.CSSProperties = {
  color: "#b91c1c",
  fontWeight: 900,
};

