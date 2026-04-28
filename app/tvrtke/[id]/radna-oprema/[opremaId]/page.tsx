"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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

type Dokument = {
  id: string;
  radnaOpremaId: string;
  naziv: string;
  tip: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function RadnaOpremaDetaljiPage() {
  const params = useParams();
  const firmaIdRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const opremaIdRaw = Array.isArray(params.opremaId)
    ? params.opremaId[0]
    : params.opremaId;

  const firmaId = String(firmaIdRaw ?? "");
  const opremaId = String(opremaIdRaw ?? "");

  const [item, setItem] = useState<RadnaOprema | null>(null);
  const [dokumenti, setDokumenti] = useState<Dokument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [greska, setGreska] = useState("");

  const [nazivDokumenta, setNazivDokumenta] = useState("");
  const [tipDokumenta, setTipDokumenta] = useState("atest");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!opremaId) return;
    ucitaj();
  }, [opremaId]);

  const ucitaj = async () => {
    try {
      setLoading(true);
      setGreska("");

      const [opremaRes, dokumentiRes] = await Promise.all([
        fetch(`/api/radna-oprema/${opremaId}`, {
          cache: "no-store",
        }),
        fetch(`/api/radna-oprema-dokumenti?radnaOpremaId=${opremaId}`, {
          cache: "no-store",
        }),
      ]);

      if (!opremaRes.ok) {
        throw new Error("Ne mogu učitati podatke o stroju.");
      }

      if (!dokumentiRes.ok) {
        throw new Error("Ne mogu učitati dokumente.");
      }

      const data = await opremaRes.json();
      const docs = await dokumentiRes.json();

      setItem(data);
      setDokumenti(docs);
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri učitavanju.");
    } finally {
      setLoading(false);
    }
  };

  const slike = useMemo(
    () =>
      dokumenti.filter(
        (doc) =>
          doc.tip === "slika" ||
          doc.mimeType?.startsWith("image/")
      ),
    [dokumenti]
  );

  const ostaliDokumenti = useMemo(
    () =>
      dokumenti.filter(
        (doc) =>
          !(doc.tip === "slika" || doc.mimeType?.startsWith("image/"))
      ),
    [dokumenti]
  );

  const formatDate = (value: string | null) => {
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

  const detaljUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/tvrtke/${firmaId}/radna-oprema/${opremaId}`;
  }, [firmaId, opremaId]);

  const qrUrl = useMemo(() => {
    if (!detaljUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      detaljUrl
    )}`;
  }, [detaljUrl]);

  const uploadDokument = async () => {
    if (!opremaId) {
      alert("Nedostaje ID stroja.");
      return;
    }

    if (!nazivDokumenta.trim()) {
      alert("Upiši naziv dokumenta.");
      return;
    }

    if (!selectedFile) {
      alert("Odaberi dokument.");
      return;
    }

    try {
      setUploading(true);
      setGreska("");

      const formData = new FormData();
      formData.append("radnaOpremaId", opremaId);
      formData.append("naziv", nazivDokumenta);
      formData.append("tip", tipDokumenta);
      formData.append("file", selectedFile);

      const res = await fetch("/api/radna-oprema-dokumenti", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Greška kod uploada dokumenta.");
      }

      setNazivDokumenta("");
      setTipDokumenta("atest");
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      alert("Dokument uspješno uploadan.");
      await ucitaj();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška kod uploada.");
    } finally {
      setUploading(false);
    }
  };

  const obrisiDokument = async (id: string) => {
    const potvrda = window.confirm("Obrisati dokument?");
    if (!potvrda) return;

    try {
      const res = await fetch(`/api/radna-oprema-dokumenti/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu obrisati dokument.");
      }

      await ucitaj();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška pri brisanju.");
    }
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

  if (greska || !item) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h1 style={{ marginTop: 0 }}>Greška</h1>
            <p>{greska || "Stroj nije pronađen."}</p>
            <Link href={`/tvrtke/${firmaId}/radna-oprema`} style={primaryLinkStyle}>
              Natrag na evidenciju
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
          <Link href={`/tvrtke/${firmaId}/radna-oprema`} style={backLinkStyle}>
            ← Natrag na radnu opremu
          </Link>
        </div>

        <div style={heroCardStyle}>
          <div>
            <div style={heroBadgeStyle}>QR detalji stroja</div>
            <h1 style={heroTitleStyle}>{item.naziv}</h1>
            <div style={heroMetaStyle}>
              <div><strong>Tip:</strong> {item.tip || "-"}</div>
              <div><strong>Status:</strong> {item.status || "-"}</div>
              <div><strong>Tvornički broj:</strong> {item.serijskiBroj || "-"}</div>
              <div><strong>Inventarni broj:</strong> {item.inventarniBroj || "-"}</div>
            </div>
          </div>
        </div>

        <div style={contentGridStyle}>
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Podaci o stroju</h2>

            <div style={detailsGridStyle}>
              <Detail label="Naziv" value={item.naziv} />
              <Detail label="Tip" value={item.tip} />
              <Detail label="Proizvođač" value={item.proizvodjac || "-"} />
              <Detail label="Model" value={item.model || "-"} />
              <Detail label="Tvornički broj" value={item.serijskiBroj || "-"} />
              <Detail label="Inventarni broj" value={item.inventarniBroj || "-"} />
              <Detail label="Datum nabave" value={formatDate(item.datumNabave)} />
              <Detail label="Datum zadnjeg servisa" value={formatDate(item.datumServisa)} />
              <Detail label="Sljedeći servis" value={formatDate(item.sljedeciServis)} />
              <Detail label="Status" value={item.status || "-"} />
            </div>

            <div style={{ marginTop: 18 }}>
              <div style={labelStyle}>Napomena</div>
              <div style={noteBoxStyle}>{item.napomena || "-"}</div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>QR kod</h2>

            <p style={mutedTextStyle}>
              Skeniranjem ovog QR koda otvara se stranica s podacima o ovom stroju.
            </p>

            {qrUrl ? (
              <div style={{ textAlign: "center" }}>
                <img
                  src={qrUrl}
                  alt="QR kod stroja"
                  style={{ width: 240, height: 240, borderRadius: 12 }}
                />
              </div>
            ) : null}

            <div style={{ marginTop: 16 }}>
              <div style={labelStyle}>Link za QR</div>
              <div style={linkBoxStyle}>{detaljUrl || "-"}</div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a href={qrUrl} target="_blank" style={primaryLinkStyle}>
                Otvori QR sliku
              </a>

              <button
                type="button"
                onClick={() => window.print()}
                style={secondaryButtonStyle}
              >
                Ispis
              </button>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Slike stroja</h2>

          {slike.length === 0 ? (
            <div style={emptyStyle}>Nema učitanih slika.</div>
          ) : (
            <div style={imagesGridStyle}>
              {slike.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setPreviewImage(doc.fileUrl);
                    setPreviewTitle(doc.naziv);
                  }}
                  style={imageThumbButtonStyle}
                >
                  <img
                    src={doc.fileUrl}
                    alt={doc.naziv}
                    style={imageThumbStyle}
                  />
                  <div style={imageCaptionStyle}>{doc.naziv}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Dokumentacija i atesti</h2>

          <div style={uploadGridStyle}>
            <div>
              <label style={labelStyle}>Naziv dokumenta</label>
              <input
                value={nazivDokumenta}
                onChange={(e) => setNazivDokumenta(e.target.value)}
                placeholder="npr. Atest 2026"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tip dokumenta</label>
              <select
                value={tipDokumenta}
                onChange={(e) => setTipDokumenta(e.target.value)}
                style={inputStyle}
              >
                <option value="atest">Atest</option>
                <option value="servis">Servis</option>
                <option value="slika">Slika</option>
                <option value="uputa">Uputa</option>
                <option value="ostalo">Ostalo</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Dokument</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                type="button"
                onClick={uploadDokument}
                disabled={uploading}
                style={primaryButtonStyle}
              >
                {uploading ? "Upload..." : "Upload dokumenta"}
              </button>
            </div>
          </div>

          {selectedFile ? (
            <div style={{ marginTop: 12, color: "#374151" }}>
              Odabrani dokument: <strong>{selectedFile.name}</strong>
            </div>
          ) : null}

          {greska ? <div style={errorStyle}>{greska}</div> : null}

          <div style={{ marginTop: 22 }}>
            {ostaliDokumenti.length === 0 ? (
              <div style={emptyStyle}>Nema učitanih dokumenata.</div>
            ) : (
              <div style={docsListStyle}>
                {ostaliDokumenti.map((doc) => (
                  <div key={doc.id} style={docCardStyle}>
                    <div>
                      <div style={docTitleStyle}>{doc.naziv}</div>
                      <div style={docMetaStyle}>
                        Tip: {doc.tip} • Dodano: {formatDate(doc.createdAt)}
                      </div>
                      <div style={docMetaStyle}>
                        Datoteka: {doc.fileName}
                      </div>
                    </div>

                    <div style={docActionsStyle}>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        style={smallLinkStyle}
                      >
                        Otvori
                      </a>

                      <a
                        href={doc.fileUrl}
                        download
                        style={smallLinkStyle}
                      >
                        Preuzmi
                      </a>

                      <button
                        type="button"
                        onClick={() => obrisiDokument(doc.id)}
                        style={dangerButtonStyle}
                      >
                        Obriši
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {previewImage ? (
          <div style={lightboxOverlayStyle} onClick={() => setPreviewImage(null)}>
            <div style={lightboxInnerStyle} onClick={(e) => e.stopPropagation()}>
              <div style={lightboxHeaderStyle}>
                <div style={lightboxTitleStyle}>{previewTitle}</div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  style={lightboxCloseStyle}
                >
                  ✕
                </button>
              </div>

              <div style={lightboxImageWrapStyle}>
                <img
                  src={previewImage}
                  alt={previewTitle}
                  style={lightboxImageStyle}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailCardStyle}>
      <div style={detailLabelStyle}>{label}</div>
      <div style={detailValueStyle}>{value}</div>
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

const heroCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 22,
  boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
  padding: 28,
  marginBottom: 24,
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

const contentGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.5fr 1fr",
  gap: 20,
  marginBottom: 20,
};

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 20,
  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
  padding: 22,
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginTop: 0,
  marginBottom: 16,
  color: "#111827",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 6,
  display: "block",
};

const noteBoxStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  whiteSpace: "pre-wrap",
  color: "#111827",
};

const mutedTextStyle: React.CSSProperties = {
  color: "#6b7280",
  marginTop: 0,
  marginBottom: 16,
};

const linkBoxStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  wordBreak: "break-all",
  color: "#111827",
};

const uploadGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 14,
  alignItems: "end",
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

const docsListStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const docCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  flexWrap: "wrap",
  background: "#f9fafb",
};

const docTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 4,
};

const docMetaStyle: React.CSSProperties = {
  color: "#6b7280",
  fontSize: 13,
};

const docActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const imagesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 14,
};

const imageThumbButtonStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  borderRadius: 14,
  padding: 10,
  cursor: "pointer",
  textAlign: "left",
};

const imageThumbStyle: React.CSSProperties = {
  width: "100%",
  height: 150,
  objectFit: "cover",
  borderRadius: 10,
  display: "block",
  marginBottom: 8,
};

const imageCaptionStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#111827",
};

const lightboxOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 24, 39, 0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 24,
};

const lightboxInnerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 1100,
  background: "#111827",
  borderRadius: 18,
  padding: 16,
};

const lightboxHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const lightboxTitleStyle: React.CSSProperties = {
  color: "white",
  fontWeight: 700,
  fontSize: 16,
};

const lightboxCloseStyle: React.CSSProperties = {
  background: "transparent",
  color: "white",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
};

const lightboxImageWrapStyle: React.CSSProperties = {
  textAlign: "center",
};

const lightboxImageStyle: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "80vh",
  borderRadius: 12,
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

const dangerButtonStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
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

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 16px",
  background: "#111827",
  color: "white",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 700,
};

const backLinkStyle: React.CSSProperties = {
  color: "#111827",
  textDecoration: "none",
  fontWeight: 700,
};