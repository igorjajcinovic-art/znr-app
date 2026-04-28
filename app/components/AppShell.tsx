"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [brojUpozorenja, setBrojUpozorenja] = useState<number>(0);

  useEffect(() => {
    ucitajBrojUpozorenja();
  }, [pathname]);

  const ucitajBrojUpozorenja = async () => {
    try {
      const res = await fetch("/api/upozorenja/count", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      setBrojUpozorenja(Number(data.ukupno || 0));
    } catch {
      setBrojUpozorenja(0);
    }
  };

  const odjava = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  };

  const dijeloviPutanje = pathname.split("/").filter(Boolean);

  const firmaId =
    dijeloviPutanje[0] === "tvrtke" && dijeloviPutanje[1]
      ? dijeloviPutanje[1]
      : "";

  const imaAktivnuFirmu = Boolean(firmaId);

  const linkTvrtka = imaAktivnuFirmu ? `/tvrtke/${firmaId}` : "/tvrtke";

  const getTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/tvrtke") return "Tvrtke";

    if (pathname.includes("/radnici")) return "Radnici";
    if (pathname.includes("/lijecnicki")) return "Liječnički pregledi";
    if (pathname.includes("/osposobljavanja")) return "Osposobljavanja";
    if (pathname.includes("/oprema") && !pathname.includes("/radna-oprema")) {
      return "OZO oprema";
    }
    if (pathname.includes("/radna-oprema")) return "Radna oprema";
    if (pathname.includes("/planer")) return "Planer";
    if (pathname.includes("/upozorenja")) return "Upozorenja";
    if (pathname.startsWith("/tvrtke/")) return "Detalji tvrtke";

    return "ZNR aplikacija";
  };

  const navItems = [
    {
      label: "Dashboard",
      href: imaAktivnuFirmu ? `/tvrtke/${firmaId}` : "/tvrtke",
      icon: "⌂",
    },
    {
      label: "Tvrtke",
      href: "/tvrtke",
      icon: "▦",
    },
    {
      label: "Radnici",
      href: imaAktivnuFirmu ? `/tvrtke/${firmaId}/radnici` : "/tvrtke",
      icon: "👥",
    },
    {
      label: "Liječnički pregledi",
      href: imaAktivnuFirmu ? `/tvrtke/${firmaId}/lijecnicki` : "/tvrtke",
      icon: "⚕",
    },
    {
      label: "Osposobljavanja",
      href: imaAktivnuFirmu
        ? `/tvrtke/${firmaId}/osposobljavanja`
        : "/tvrtke",
      icon: "▱",
    },
    {
      label: "OZO oprema",
      href: imaAktivnuFirmu ? `/tvrtke/${firmaId}/oprema` : "/tvrtke",
      icon: "▣",
    },
    {
      label: "Radna oprema",
      href: imaAktivnuFirmu ? `/tvrtke/${firmaId}/radna-oprema` : "/tvrtke",
      icon: "⚒",
    },
    {
      label: "Planer",
      href: imaAktivnuFirmu ? `/tvrtke/${firmaId}/planer` : "/tvrtke",
      icon: "▢",
    },
    {
      label: "Upozorenja",
      href: imaAktivnuFirmu ? `/tvrtke/${firmaId}/upozorenja` : "/tvrtke",
      icon: "!",
    },
  ];

  return (
    <div style={shellStyle}>
      <aside style={sidebarStyle}>
        <Link href={linkTvrtka} style={logoWrapStyle}>
          <div style={logoIconStyle}>🛡️</div>
          <div>
            <div style={logoTitleStyle}>ZNR</div>
            <div style={logoSubtitleStyle}>APLIKACIJA</div>
          </div>
        </Link>

        <nav style={navStyle}>
          {navItems.map((item) => {
            const active =
              item.href === "/tvrtke"
                ? pathname === "/tvrtke"
                : pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  ...navItemStyle,
                  ...(active ? navItemActiveStyle : {}),
                }}
              >
                <span style={navIconStyle}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {!imaAktivnuFirmu ? (
          <div style={infoBoxStyle}>
            Odaberi tvrtku da bi se otvorili moduli.
          </div>
        ) : null}

        <div style={sidebarFooterStyle}>
          <div style={footerLogoStyle}>🛡️</div>
          <div>
            <div style={footerTitleStyle}>ZNR aplikacija</div>
            <div style={footerVersionStyle}>v1.0.0</div>
          </div>
        </div>
      </aside>

      <main style={mainStyle}>
        <header style={topbarStyle}>
          <div>
            <div style={topbarLabelStyle}>Trenutni modul</div>
            <div style={topbarTitleStyle}>{getTitle()}</div>
          </div>

          <div style={topbarRightStyle}>
            <Link
              href={imaAktivnuFirmu ? `/tvrtke/${firmaId}/upozorenja` : "/tvrtke"}
              style={notificationWrapStyle}
            >
              <div style={bellStyle}>🔔</div>

              {brojUpozorenja > 0 ? (
                <div style={notificationDotStyle}>
                  {brojUpozorenja > 99 ? "99+" : brojUpozorenja}
                </div>
              ) : null}
            </Link>

            <div style={avatarStyle}>AD</div>

            <button type="button" onClick={odjava} style={logoutButtonStyle}>
              Odjava
            </button>
          </div>
        </header>

        <div style={contentStyle}>{children}</div>
      </main>
    </div>
  );
}

const shellStyle: React.CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  background: "#eef2f7",
};

const sidebarStyle: React.CSSProperties = {
  width: 270,
  minHeight: "100vh",
  background:
    "linear-gradient(180deg, #0f2747 0%, #0b1b33 55%, #071426 100%)",
  color: "white",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  left: 0,
  top: 0,
  bottom: 0,
  boxShadow: "8px 0 30px rgba(15, 23, 42, 0.18)",
  zIndex: 20,
};

const logoWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "28px 26px 24px",
  color: "white",
  textDecoration: "none",
};

const logoIconStyle: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: 18,
  border: "3px solid #6ee7b7",
  color: "#6ee7b7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  fontWeight: 900,
  boxShadow: "0 0 20px rgba(110, 231, 183, 0.18)",
};

const logoTitleStyle: React.CSSProperties = {
  fontSize: 32,
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: 1,
};

const logoSubtitleStyle: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: 1.5,
  opacity: 0.85,
  marginTop: 4,
};

const navStyle: React.CSSProperties = {
  padding: "10px 14px",
  display: "grid",
  gap: 6,
};

const navItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  color: "rgba(255,255,255,0.82)",
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const navItemActiveStyle: React.CSSProperties = {
  background: "rgba(96, 165, 250, 0.18)",
  color: "white",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
};

const navIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  opacity: 0.9,
};

const infoBoxStyle: React.CSSProperties = {
  margin: "10px 18px",
  padding: 14,
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.75)",
  fontSize: 13,
  lineHeight: 1.4,
};

const sidebarFooterStyle: React.CSSProperties = {
  marginTop: "auto",
  padding: 22,
  borderTop: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const footerLogoStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 14,
  border: "2px solid rgba(255,255,255,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
};

const footerTitleStyle: React.CSSProperties = {
  fontSize: 13,
  textTransform: "uppercase",
  opacity: 0.9,
};

const footerVersionStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.6,
  marginTop: 3,
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  marginLeft: 270,
  minHeight: "100vh",
};

const topbarStyle: React.CSSProperties = {
  height: 86,
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(10px)",
  borderBottom: "1px solid rgba(148, 163, 184, 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 34px",
  position: "sticky",
  top: 0,
  zIndex: 10,
};

const topbarLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.8,
  marginBottom: 4,
};

const topbarTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
};

const topbarRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const notificationWrapStyle: React.CSSProperties = {
  position: "relative",
  textDecoration: "none",
};

const bellStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
};

const notificationDotStyle: React.CSSProperties = {
  position: "absolute",
  top: -8,
  right: -8,
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 999,
  background: "#ef4444",
  color: "white",
  fontSize: 11,
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "2px solid white",
};

const avatarStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 999,
  background: "#dbeafe",
  color: "#0f2f5f",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const logoutButtonStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "none",
  background: "#e5e7eb",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
};

const contentStyle: React.CSSProperties = {
  minHeight: "calc(100vh - 86px)",
  padding: 24,
  maxWidth: 1400,
  margin: "0 auto",
};