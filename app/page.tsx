import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RokItem = {
  title: string;
  detail: string;
  date: Date;
  href: string;
  type: string;
};

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function daysUntil(date: Date) {
  const today = startOfToday();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function isWarningDate(date: Date | null) {
  if (!date) return false;
  return daysUntil(date) <= 30;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function statusLabel(diff: number) {
  if (diff < 0) return "Isteklo";
  if (diff === 0) return "Danas";
  if (diff <= 7) return `${diff} dana`;
  return `${diff} dana`;
}

export default async function Page() {
  const [
    tvrtke,
    aktivniRadnici,
    sviRadnici,
    lijecnicki,
    osposobljavanja,
    ozo,
    radnaOprema,
    planer,
  ] = await Promise.all([
    prisma.tvrtka.findMany({ orderBy: { naziv: "asc" } }),
    prisma.radnik.findMany({ where: { aktivan: true }, orderBy: { ime: "asc" } }),
    prisma.radnik.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.lijecnickiPregled.findMany({ orderBy: { vrijediDo: "asc" } }),
    prisma.strucnoOsposobljavanje.findMany({ orderBy: { vrijediDo: "asc" } }),
    prisma.oprema.findMany({ orderBy: { rokZamjene: "asc" } }),
    prisma.radnaOprema.findMany({ orderBy: { sljedeciServis: "asc" } }),
    prisma.planer.findMany({ orderBy: { datum: "asc" } }),
  ]);

  const tvrtkaPoId = new Map(tvrtke.map((t) => [t.id, t]));
  const aktivniPoFirmiIOibu = new Set(
    aktivniRadnici.map((r) => `${r.firmaId}-${r.oib}`)
  );
  const aktivniPoId = new Set(aktivniRadnici.map((r) => r.id));
  const radnikPoFirmiIOibu = new Map(
    sviRadnici.map((r) => [`${r.firmaId}-${r.oib}`, r])
  );

  const upozorenja = {
    dozvole: aktivniRadnici.filter(
      (r) => r.imaDozvolu && isWarningDate(r.dozvolaDo)
    ).length,
    lijecnicki: lijecnicki.filter(
      (p) =>
        aktivniPoFirmiIOibu.has(`${p.firmaId}-${p.oib}`) &&
        isWarningDate(p.vrijediDo)
    ).length,
    osposobljavanja: osposobljavanja.filter(
      (o) =>
        aktivniPoFirmiIOibu.has(`${o.firmaId}-${o.oib}`) &&
        isWarningDate(o.vrijediDo)
    ).length,
    ozo: ozo.filter(
      (item) =>
        aktivniPoFirmiIOibu.has(`${item.firmaId}-${item.oib}`) &&
        isWarningDate(item.rokZamjene)
    ).length,
    radnaOprema: radnaOprema.filter((item) =>
      isWarningDate(item.sljedeciServis)
    ).length,
    planer: planer.filter((item) => {
      if (item.status === "izvrseno") return false;
      if (item.radnikId && !aktivniPoId.has(item.radnikId)) return false;
      return isWarningDate(item.datum);
    }).length,
  };

  const ukupnoUpozorenja = Object.values(upozorenja).reduce(
    (sum, value) => sum + value,
    0
  );

  const rokovi: RokItem[] = [
    ...aktivniRadnici
      .filter((r) => r.imaDozvolu && r.dozvolaDo && isWarningDate(r.dozvolaDo))
      .map((r) => ({
        title: r.ime,
        detail: "Radna dozvola",
        date: r.dozvolaDo as Date,
        href: `/tvrtke/${r.firmaId}/radnici/${r.id}`,
        type: "Dozvola",
      })),
    ...lijecnicki
      .filter(
        (p) =>
          aktivniPoFirmiIOibu.has(`${p.firmaId}-${p.oib}`) &&
          isWarningDate(p.vrijediDo)
      )
      .map((p) => {
        const radnik = radnikPoFirmiIOibu.get(`${p.firmaId}-${p.oib}`);
        return {
          title: radnik?.ime || p.oib,
          detail: p.vrsta || "Liječnički pregled",
          date: p.vrijediDo,
          href: `/tvrtke/${p.firmaId}/lijecnicki`,
          type: "Liječnički",
        };
      }),
    ...osposobljavanja
      .filter(
        (o) =>
          aktivniPoFirmiIOibu.has(`${o.firmaId}-${o.oib}`) &&
          isWarningDate(o.vrijediDo)
      )
      .map((o) => {
        const radnik = radnikPoFirmiIOibu.get(`${o.firmaId}-${o.oib}`);
        return {
          title: radnik?.ime || o.oib,
          detail: o.vrsta,
          date: o.vrijediDo,
          href: `/tvrtke/${o.firmaId}/osposobljavanja`,
          type: "Osposobljavanje",
        };
      }),
    ...ozo
      .filter(
        (item) =>
          aktivniPoFirmiIOibu.has(`${item.firmaId}-${item.oib}`) &&
          item.rokZamjene &&
          isWarningDate(item.rokZamjene)
      )
      .map((item) => {
        const radnik = radnikPoFirmiIOibu.get(`${item.firmaId}-${item.oib}`);
        return {
          title: radnik?.ime || item.oib,
          detail: item.vrsta,
          date: item.rokZamjene as Date,
          href: `/tvrtke/${item.firmaId}/oprema`,
          type: "OZO",
        };
      }),
    ...radnaOprema
      .filter((item) => item.sljedeciServis && isWarningDate(item.sljedeciServis))
      .map((item) => ({
        title: item.naziv,
        detail: item.tip,
        date: item.sljedeciServis as Date,
        href: `/tvrtke/${item.firmaId}/radna-oprema/${item.id}`,
        type: "Servis",
      })),
    ...planer
      .filter((item) => {
        if (item.status === "izvrseno") return false;
        if (item.radnikId && !aktivniPoId.has(item.radnikId)) return false;
        return isWarningDate(item.datum);
      })
      .map((item) => ({
        title: item.naziv,
        detail: item.opis || item.tip,
        date: item.datum,
        href: `/tvrtke/${item.firmaId}/planer`,
        type: "Planer",
      })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  const zadnjeTvrtke = tvrtke.slice(0, 5);

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <div>
          <div style={eyebrowStyle}>Pregled sustava</div>
          <h1 style={titleStyle}>ZNR dashboard</h1>
          <p style={subtitleStyle}>
            Brzi pregled tvrtki, radnika, rokova i zadataka koji traže pažnju.
          </p>
        </div>

        <div style={heroActionsStyle}>
          <Link href="/tvrtke" style={primaryButtonStyle}>
            Tvrtke
          </Link>
          <Link href="/upozorenja" style={secondaryButtonStyle}>
            Upozorenja
          </Link>
        </div>
      </section>

      <section style={statsGridStyle}>
        <StatCard label="Tvrtke" value={tvrtke.length} href="/tvrtke" />
        <StatCard
          label="Aktivni radnici"
          value={aktivniRadnici.length}
          href="/tvrtke"
        />
        <StatCard
          label="Upozorenja"
          value={ukupnoUpozorenja}
          href="/upozorenja"
          tone={ukupnoUpozorenja > 0 ? "danger" : "ok"}
        />
        <StatCard
          label="Zadaci u planeru"
          value={planer.filter((item) => item.status !== "izvrseno").length}
          href="/tvrtke"
        />
      </section>

      <section style={mainGridStyle}>
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div>
              <h2 style={panelTitleStyle}>Najbliži rokovi</h2>
              <div style={mutedStyle}>Isteklo ili istječe u idućih 30 dana</div>
            </div>
            <Link href="/upozorenja" style={smallLinkStyle}>
              Sva upozorenja
            </Link>
          </div>

          {rokovi.length === 0 ? (
            <div style={emptyStyle}>Nema aktivnih rokova za prikaz.</div>
          ) : (
            <div style={listStyle}>
              {rokovi.map((rok, index) => {
                const diff = daysUntil(rok.date);
                const urgent = diff <= 7;
                const tvrtka = tvrtkaPoId.get(rok.href.split("/")[2] || "");

                return (
                  <Link
                    key={`${rok.type}-${rok.title}-${rok.date.toISOString()}-${index}`}
                    href={rok.href}
                    style={rowStyle}
                  >
                    <div style={rowMainStyle}>
                      <div style={rowTitleStyle}>{rok.title}</div>
                      <div style={rowMetaStyle}>
                        {rok.type} · {rok.detail}
                        {tvrtka ? ` · ${tvrtka.naziv}` : ""}
                      </div>
                    </div>
                    <div
                      style={{
                        ...statusPillStyle,
                        ...(urgent ? statusPillDangerStyle : {}),
                      }}
                    >
                      {statusLabel(diff)}
                    </div>
                    <div style={dateStyle}>{formatDate(rok.date)}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <aside style={sideStackStyle}>
          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>Upozorenja po tipu</h2>
            <div style={warningListStyle}>
              <WarningRow label="Dozvole" value={upozorenja.dozvole} />
              <WarningRow label="Liječnički" value={upozorenja.lijecnicki} />
              <WarningRow
                label="Osposobljavanja"
                value={upozorenja.osposobljavanja}
              />
              <WarningRow label="OZO oprema" value={upozorenja.ozo} />
              <WarningRow label="Radna oprema" value={upozorenja.radnaOprema} />
              <WarningRow label="Planer" value={upozorenja.planer} />
            </div>
          </div>

          <div style={panelStyle}>
            <div style={panelHeaderStyle}>
              <h2 style={panelTitleStyle}>Tvrtke</h2>
              <Link href="/tvrtke" style={smallLinkStyle}>
                Otvori
              </Link>
            </div>
            <div style={companyListStyle}>
              {zadnjeTvrtke.map((tvrtka) => (
                <Link
                  key={tvrtka.id}
                  href={`/tvrtke/${tvrtka.id}`}
                  style={companyRowStyle}
                >
                  <strong>{tvrtka.naziv}</strong>
                  <span>{tvrtka.oib}</span>
                </Link>
              ))}
              {zadnjeTvrtke.length === 0 ? (
                <div style={emptyStyle}>Još nema unesenih tvrtki.</div>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone?: "danger" | "ok";
}) {
  return (
    <Link href={href} style={statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div
        style={{
          ...statValueStyle,
          ...(tone === "danger" ? statDangerStyle : {}),
          ...(tone === "ok" ? statOkStyle : {}),
        }}
      >
        {value}
      </div>
    </Link>
  );
}

function WarningRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={warningRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 20,
};

const heroStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 18,
  padding: 24,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#0f766e",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "6px 0 8px",
  fontSize: 34,
  lineHeight: 1.1,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#64748b",
  fontSize: 15,
};

const heroActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "11px 15px",
  borderRadius: 8,
  background: "#0f2747",
  color: "white",
  textDecoration: "none",
  fontWeight: 900,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "11px 15px",
  borderRadius: 8,
  background: "#f8fafc",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #cbd5e1",
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 14,
};

const statCardStyle: React.CSSProperties = {
  minHeight: 116,
  padding: 18,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  textDecoration: "none",
  color: "#0f172a",
  display: "grid",
  alignContent: "space-between",
};

const statLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
};

const statValueStyle: React.CSSProperties = {
  fontSize: 38,
  lineHeight: 1,
  fontWeight: 900,
};

const statDangerStyle: React.CSSProperties = {
  color: "#dc2626",
};

const statOkStyle: React.CSSProperties = {
  color: "#0f766e",
};

const mainGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.7fr) minmax(300px, 0.9fr)",
  gap: 18,
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 18,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
};

const panelHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
};

const smallLinkStyle: React.CSSProperties = {
  color: "#0f766e",
  fontWeight: 900,
  textDecoration: "none",
  fontSize: 13,
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  alignItems: "center",
  gap: 12,
  padding: "12px 0",
  borderTop: "1px solid #eef2f7",
  color: "#0f172a",
  textDecoration: "none",
};

const rowMainStyle: React.CSSProperties = {
  minWidth: 0,
};

const rowTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const rowMetaStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const statusPillStyle: React.CSSProperties = {
  minWidth: 74,
  textAlign: "center",
  padding: "6px 9px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#92400e",
  fontSize: 12,
  fontWeight: 900,
};

const statusPillDangerStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
};

const dateStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

const sideStackStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
  alignContent: "start",
};

const warningListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginTop: 14,
};

const warningRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 0",
  borderTop: "1px solid #eef2f7",
  color: "#334155",
};

const companyListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const companyRowStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  padding: "10px 0",
  borderTop: "1px solid #eef2f7",
  color: "#0f172a",
  textDecoration: "none",
};

const emptyStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 8,
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 700,
};
