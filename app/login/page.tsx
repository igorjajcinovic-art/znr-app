"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [lozinka, setLozinka] = useState("");
  const [loading, setLoading] = useState(false);
  const [greska, setGreska] = useState("");

  const prijava = async () => {
    try {
      setLoading(true);
      setGreska("");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          lozinka,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Neuspješna prijava.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setGreska(err instanceof Error ? err.message : "Greška kod prijave.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>🛡️</div>

        <h1 style={titleStyle}>ZNR aplikacija</h1>
        <p style={subtitleStyle}>Prijava u sustav</p>

        <div style={formStyle}>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="admin@test.hr"
            />
          </div>

          <div>
            <label style={labelStyle}>Lozinka</label>
            <input
              type="password"
              value={lozinka}
              onChange={(e) => setLozinka(e.target.value)}
              style={inputStyle}
              placeholder="123456"
              onKeyDown={(e) => {
                if (e.key === "Enter") prijava();
              }}
            />
          </div>
        </div>

        {greska ? <div style={errorStyle}>{greska}</div> : null}

        <button
          type="button"
          onClick={prijava}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? "Prijava..." : "Prijavi se"}
        </button>

        <div style={noteStyle}>
          Ako nema korisnika, prva prijava automatski kreira admin korisnika.
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #0f2747 0%, #0b1b33 55%, #071426 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 430,
  background: "white",
  borderRadius: 24,
  padding: 34,
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const logoStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 20,
  background: "#0f2747",
  color: "#6ee7b7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 34,
  marginBottom: 20,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 900,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 24,
  color: "#64748b",
  fontSize: 15,
};

const formStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 14,
  fontWeight: 800,
  color: "#0f172a",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 20,
  padding: "13px 16px",
  borderRadius: 12,
  border: "none",
  background: "#0f2747",
  color: "white",
  fontSize: 15,
  fontWeight: 900,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 12,
  borderRadius: 12,
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #f87171",
  fontSize: 14,
  fontWeight: 700,
};

const noteStyle: React.CSSProperties = {
  marginTop: 16,
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.5,
};