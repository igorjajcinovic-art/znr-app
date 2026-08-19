"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Dokument = {
  id: string;
  firmaId: string;
  naziv: string;
  tip: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  napomena: string | null;
  createdAt: string;
};

type Props = {
  firmaId: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${String(date.getDate()).padStart(2, "0")}.${String(
    date.getMonth() + 1
  ).padStart(2, "0")}.${date.getFullYear()}.`;
}

export default function TvrtkaDokumentiPanel({ firmaId }: Props) {
  const [dokumenti, setDokumenti] = useState<Dokument[]>([]);
  const [naziv, setNaziv] = useState("");
  const [tip, setTip] = useState("procjena-rizika");
  const [napomena, setNapomena] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [greska, setGreska] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ucitaj = useCallback(async () => {
    try {
      setLoading(true);
      setGreska("");

      const res = await fetch(
        `/api/tvrtke-dokumenti?firmaId=${encodeURIComponent(firmaId)}`,
        { cache: "no-store" }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu ucitati dokumente firme.");
      }

      const data: Dokument[] = await res.json();
      setDokumenti(data);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greska pri ucitavanju.");
    } finally {
      setLoading(false);
    }
  }, [firmaId]);

  useEffect(() => {
    ucitaj();
  }, [ucitaj]);

  const upload = async () => {
    if (!naziv.trim()) {
      alert("Upisi naziv dokumenta.");
      return;
    }

    if (!file) {
      alert("Odaberi datoteku.");
      return;
    }

    try {
      setUploading(true);
      setGreska("");

      const formData = new FormData();
      formData.append("firmaId", firmaId);
      formData.append("naziv", naziv);
      formData.append("tip", tip);
      formData.append("napomena", napomena);
      formData.append("file", file);

      const res = await fetch("/api/tvrtke-dokumenti", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu uploadati dokument.");
      }

      setNaziv("");
      setTip("procjena-rizika");
      setNapomena("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await ucitaj();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greska kod uploada.");
    } finally {
      setUploading(false);
    }
  };

  const obrisi = async (id: string) => {
    if (!confirm("Obrisati dokument firme?")) return;

    try {
      setGreska("");
      const res = await fetch(`/api/tvrtke-dokumenti/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati dokument.");
      }

      await ucitaj();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greska pri brisanju.");
    }
  };

  return (
    <section style={panelStyle}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={panelTitleStyle}>Dokumenti firme</h2>
          <div style={mutedStyle}>Procjene, pravilnici, zapisnici i ostali dokumenti.</div>
        </div>
        <div style={countStyle}>{dokumenti.length}</div>
      </div>

      <div style={uploadGridStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Naziv dokumenta</span>
          <input
            value={naziv}
            onChange={(e) => setNaziv(e.target.value)}
            placeholder="npr. Procjena rizika"
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Tip</span>
          <select value={tip} onChange={(e) => setTip(e.target.value)} style={inputStyle}>
            <option value="procjena-rizika">Procjena rizika</option>
            <option value="pravilnik">Pravilnik</option>
            <option value="zapisnik">Zapisnik</option>
            <option value="ugovor">Ugovor</option>
            <option value="dozvola">Dozvola</option>
            <option value="ostalo">Ostalo</option>
          </select>
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Datoteka</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Napomena</span>
          <input
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            placeholder="Opcionalno"
            style={inputStyle}
          />
        </label>
      </div>

      <div style={actionsStyle}>
        <button type="button" onClick={upload} disabled={uploading} style={primaryButtonStyle}>
          {uploading ? "Upload..." : "Dodaj dokument"}
        </button>
        {file ? <span style={mutedStyle}>Odabrano: <strong>{file.name}</strong></span> : null}
      </div>

      {greska ? <div style={errorStyle}>{greska}</div> : null}

      <div style={docsWrapStyle}>
        {loading ? (
          <div style={emptyStyle}>Ucitavanje dokumenata...</div>
        ) : dokumenti.length === 0 ? (
          <div style={emptyStyle}>Nema ucitanih dokumenata za ovu firmu.</div>
        ) : (
          <div style={docsListStyle}>
            {dokumenti.map((doc) => (
              <div key={doc.id} style={docCardStyle}>
                <div>
                  <div style={docTitleStyle}>{doc.naziv}</div>
                  <div style={docMetaStyle}>Tip: {doc.tip} - Dodano: {formatDate(doc.createdAt)}</div>
                  <div style={docMetaStyle}>Datoteka: {doc.fileName}</div>
                  {doc.napomena ? <div style={docMetaStyle}>{doc.napomena}</div> : null}
                </div>
                <div style={docActionsStyle}>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={smallLinkStyle}>Otvori</a>
                  <a href={doc.fileUrl} download style={smallLinkStyle}>Preuzmi</a>
                  <button type="button" onClick={() => obrisi(doc.id)} style={dangerButtonStyle}>Obrisi</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 18,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
  marginBottom: 20,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 14,
};

const panelTitleStyle: React.CSSProperties = {
  margin: "0 0 5px",
  fontSize: 20,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
};

const countStyle: React.CSSProperties = {
  minWidth: 42,
  height: 42,
  borderRadius: 999,
  background: "#0f2747",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const uploadGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
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
  boxSizing: "border-box",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 14,
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

const docsWrapStyle: React.CSSProperties = {
  marginTop: 18,
};

const docsListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const docCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const docTitleStyle: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 900,
};

const docMetaStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
};

const docActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const smallLinkStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  textDecoration: "none",
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

const emptyStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 8,
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 700,
};

const errorStyle: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 8,
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 800,
};