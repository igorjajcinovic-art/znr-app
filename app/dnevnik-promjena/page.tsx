"use client";

import { useEffect, useState } from "react";

type AuditLog = {
  id: string;
  userEmail: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityLabel: string | null;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
};

const actionLabel = (action: string) => {
  if (action === "create") return "Dodano";
  if (action === "update") return "Izmijenjeno";
  if (action === "delete") return "Obrisano";
  return action;
};

const actionStyle = (action: string): React.CSSProperties => {
  if (action === "create") return { background: "#dcfce7", color: "#166534" };
  if (action === "update") return { background: "#dbeafe", color: "#1d4ed8" };
  if (action === "delete") return { background: "#fee2e2", color: "#991b1b" };
  return { background: "#e2e8f0", color: "#334155" };
};

function formatJson(value: unknown) {
  if (!value) return "-";
  return JSON.stringify(value, null, 2);
}

export default function DnevnikPromjenaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");

  useEffect(() => {
    async function initialLoad() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/dnevnik-promjena", {
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Ne mogu ucitati dnevnik promjena.");
        }

        setLogs(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Greska pri ucitavanju.");
      } finally {
        setLoading(false);
      }
    }

    initialLoad();
  }, []);

  const ucitaj = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (user) params.set("user", user);

      const res = await fetch(`/api/dnevnik-promjena?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu ucitati dnevnik promjena.");
      }

      setLogs(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greska pri ucitavanju.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={badgeStyle}>Admin</div>
          <h1 style={titleStyle}>Dnevnik promjena</h1>
          <p style={mutedStyle}>
            Pregled radnji korisnika: dodavanje, izmjene i brisanja zapisa.
          </p>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={filterGridStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Modul</span>
            <select
              style={inputStyle}
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
            >
              <option value="">Svi moduli</option>
              <option value="radnik">Radnici</option>
              <option value="radno_vrijeme">Radno vrijeme</option>
              <option value="korisnik">Korisnici</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Radnja</span>
            <select
              style={inputStyle}
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="">Sve radnje</option>
              <option value="create">Dodano</option>
              <option value="update">Izmijenjeno</option>
              <option value="delete">Obrisano</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Korisnik</span>
            <input
              style={inputStyle}
              value={user}
              onChange={(event) => setUser(event.target.value)}
              placeholder="ime ili email"
            />
          </label>

          <div style={filterActionStyle}>
            <button style={primaryButtonStyle} onClick={ucitaj}>
              Primijeni filter
            </button>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        {error ? <div style={errorStyle}>{error}</div> : null}
        {loading ? (
          <div style={mutedStyle}>Ucitavanje...</div>
        ) : logs.length === 0 ? (
          <div style={mutedStyle}>Nema zapisa za prikaz.</div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Vrijeme</th>
                  <th style={thStyle}>Korisnik</th>
                  <th style={thStyle}>Radnja</th>
                  <th style={thStyle}>Modul</th>
                  <th style={thStyle}>Zapis</th>
                  <th style={thStyle}>Detalji</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={tdStyle}>
                      {new Date(log.createdAt).toLocaleString("hr-HR")}
                    </td>
                    <td style={tdStyle}>
                      <strong>{log.userName || "-"}</strong>
                      <div style={subTextStyle}>{log.userEmail || "-"}</div>
                      <div style={subTextStyle}>{log.userRole || "-"}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ ...pillStyle, ...actionStyle(log.action) }}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td style={tdStyle}>{log.entityType}</td>
                    <td style={tdStyle}>{log.entityLabel || "-"}</td>
                    <td style={tdStyle}>
                      <details>
                        <summary style={summaryStyle}>Prikazi</summary>
                        <div style={detailsGridStyle}>
                          <div>
                            <strong>Prije</strong>
                            <pre style={preStyle}>{formatJson(log.oldData)}</pre>
                          </div>
                          <div>
                            <strong>Poslije</strong>
                            <pre style={preStyle}>{formatJson(log.newData)}</pre>
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const heroStyle: React.CSSProperties = {
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

const titleStyle: React.CSSProperties = {
  margin: "5px 0 7px",
  fontSize: 32,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 18,
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(180px, 1fr)) auto",
  gap: 14,
  alignItems: "end",
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

const filterActionStyle: React.CSSProperties = {
  display: "flex",
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

const errorStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: 12,
  borderRadius: 8,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 980,
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

const subTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 12,
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
};

const summaryStyle: React.CSSProperties = {
  cursor: "pointer",
  color: "#0f766e",
  fontWeight: 900,
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 10,
};

const preStyle: React.CSSProperties = {
  margin: "6px 0 0",
  maxHeight: 240,
  overflow: "auto",
  padding: 10,
  borderRadius: 8,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: 12,
};
