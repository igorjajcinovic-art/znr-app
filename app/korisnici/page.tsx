"use client";

import { useEffect, useState } from "react";

type Korisnik = {
  id: string;
  email: string;
  ime: string;
  role: string;
  createdAt: string;
};

const praznaForma = {
  ime: "",
  email: "",
  lozinka: "",
  role: "martina",
};

const roleLabel = (role: string) => {
  if (role === "admin") return "Admin";
  if (role === "martina") return "Martina";
  return "Poslovoda";
};

export default function KorisniciPage() {
  const [korisnici, setKorisnici] = useState<Korisnik[]>([]);
  const [forma, setForma] = useState(praznaForma);
  const [ucitavanje, setUcitavanje] = useState(true);
  const [spremanje, setSpremanje] = useState(false);
  const [greska, setGreska] = useState("");
  const [poruka, setPoruka] = useState("");

  useEffect(() => {
    ucitajKorisnike();
  }, []);

  const ucitajKorisnike = async () => {
    try {
      setUcitavanje(true);
      setGreska("");
      const res = await fetch("/api/korisnici", { cache: "no-store" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu ucitati korisnike.");
      }

      setKorisnici(await res.json());
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greska pri ucitavanju.");
    } finally {
      setUcitavanje(false);
    }
  };

  const dodajKorisnika = async () => {
    if (!forma.ime || !forma.email || !forma.lozinka) {
      alert("Unesi ime, email i lozinku.");
      return;
    }

    try {
      setSpremanje(true);
      setGreska("");
      setPoruka("");

      const res = await fetch("/api/korisnici", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forma),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Ne mogu dodati korisnika.");
      }

      setForma(praznaForma);
      setPoruka("Korisnik je dodan.");
      await ucitajKorisnike();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greska pri spremanju.");
    } finally {
      setSpremanje(false);
    }
  };

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={badgeStyle}>Admin</div>
          <h1 style={titleStyle}>Korisnici</h1>
          <p style={mutedStyle}>
            Dodavanje korisnika s ogranicenim ovlastima za rad u aplikaciji.
          </p>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Dodaj korisnika</h2>
        <div style={formGridStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Ime</span>
            <input
              style={inputStyle}
              value={forma.ime}
              onChange={(e) => setForma({ ...forma, ime: e.target.value })}
              placeholder="npr. Poslovoda"
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Email / korisnicko ime</span>
            <input
              style={inputStyle}
              value={forma.email}
              onChange={(e) => setForma({ ...forma, email: e.target.value })}
              placeholder="poslovoda@firma.hr"
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Lozinka</span>
            <input
              type="password"
              style={inputStyle}
              value={forma.lozinka}
              onChange={(e) => setForma({ ...forma, lozinka: e.target.value })}
              placeholder="minimalno 6 znakova"
            />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Uloga</span>
            <select
              style={inputStyle}
              value={forma.role}
              onChange={(e) => setForma({ ...forma, role: e.target.value })}
            >
              <option value="martina">Martina</option>
              <option value="poslovoda">Poslovoda</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        </div>

        <div style={actionRowStyle}>
          <button
            style={primaryButtonStyle}
            onClick={dodajKorisnika}
            disabled={spremanje}
          >
            {spremanje ? "Spremanje..." : "Dodaj korisnika"}
          </button>
        </div>

        {greska ? <div style={errorStyle}>{greska}</div> : null}
        {poruka ? <div style={successStyle}>{poruka}</div> : null}
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Postojeci korisnici</h2>
        {ucitavanje ? (
          <div style={mutedStyle}>Ucitavanje...</div>
        ) : korisnici.length === 0 ? (
          <div style={mutedStyle}>Nema korisnika.</div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Ime</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Uloga</th>
                  <th style={thStyle}>Kreiran</th>
                </tr>
              </thead>
              <tbody>
                {korisnici.map((korisnik) => (
                  <tr key={korisnik.id}>
                    <td style={tdStyle}>{korisnik.ime}</td>
                    <td style={tdStyle}>{korisnik.email}</td>
                    <td style={tdStyle}>
                      <span style={pillStyle}>
                        {roleLabel(korisnik.role)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {new Date(korisnik.createdAt).toLocaleDateString("hr-HR")}
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

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 20,
  color: "#0f172a",
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 14,
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

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
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
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#e0f2fe",
  color: "#075985",
  fontSize: 12,
  fontWeight: 900,
};
