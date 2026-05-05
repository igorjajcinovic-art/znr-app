import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deadlineStatus,
  deadlineText,
  formatHrDate,
  type DeadlineStatus,
} from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
    radnikId: string;
  }>;
};

function statusStyle(status: DeadlineStatus) {
  if (status === "expired") return { ...pillStyle, ...expiredPillStyle };
  if (status === "warning") return { ...pillStyle, ...warningPillStyle };
  if (status === "ok") return { ...pillStyle, ...okPillStyle };
  return { ...pillStyle, ...mutedPillStyle };
}

export default async function RadnikDetaljPage({ params }: PageProps) {
  const { id: firmaId, radnikId } = await params;

  const [tvrtka, radnik] = await Promise.all([
    prisma.tvrtka.findUnique({ where: { id: firmaId } }),
    prisma.radnik.findFirst({
      where: {
        id: radnikId,
        firmaId,
      },
    }),
  ]);

  if (!tvrtka || !radnik) notFound();

  const [lijecnicki, osposobljavanja, ozo] = await Promise.all([
    prisma.lijecnickiPregled.findMany({
      where: {
        firmaId,
        oib: radnik.oib,
      },
      orderBy: [{ vrijediDo: "asc" }, { createdAt: "desc" }],
    }),
    prisma.strucnoOsposobljavanje.findMany({
      where: {
        firmaId,
        oib: radnik.oib,
      },
      orderBy: [{ vrijediDo: "asc" }, { createdAt: "desc" }],
    }),
    prisma.oprema.findMany({
      where: {
        firmaId,
        oib: radnik.oib,
      },
      orderBy: [{ rokZamjene: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const otvoreniRokovi = [
    radnik.imaDozvolu ? deadlineStatus(radnik.dozvolaDo) : "muted",
    ...lijecnicki.map((item) => deadlineStatus(item.vrijediDo)),
    ...osposobljavanja.map((item) => deadlineStatus(item.vrijediDo)),
    ...ozo.map((item) => deadlineStatus(item.rokZamjene)),
  ];

  const kriticno = otvoreniRokovi.filter((status) => status === "expired").length;
  const uskoro = otvoreniRokovi.filter((status) => status === "warning").length;

  const ukupniStatus: DeadlineStatus = !radnik.aktivan
    ? "muted"
    : kriticno > 0
    ? "expired"
    : uskoro > 0
    ? "warning"
    : "ok";

  return (
    <div style={pageStyle}>
      <div style={topNavStyle}>
        <Link href={`/tvrtke/${firmaId}/radnici`} style={backLinkStyle}>
          Nazad na radnike
        </Link>
        <Link href={`/tvrtke/${firmaId}`} style={plainLinkStyle}>
          {tvrtka.naziv}
        </Link>
      </div>

      <section style={heroStyle}>
        <div style={avatarStyle}>{radnik.ime.slice(0, 2).toUpperCase()}</div>

        <div style={heroMainStyle}>
          <div style={eyebrowStyle}>Profil radnika</div>
          <h1 style={titleStyle}>{radnik.ime}</h1>
          <div style={subtitleStyle}>
            {radnik.radnoMjesto || "Radno mjesto nije upisano"} · OIB {radnik.oib}
          </div>
        </div>

        <div style={statusStyle(ukupniStatus)}>
          {!radnik.aktivan
            ? "Neaktivan"
            : ukupniStatus === "expired"
            ? "Ima isteklih rokova"
            : ukupniStatus === "warning"
            ? "Rokovi uskoro"
            : "Uredno"}
        </div>
      </section>

      <section style={statsGridStyle}>
        <Metric label="Liječnički" value={lijecnicki.length} />
        <Metric label="Osposobljavanja" value={osposobljavanja.length} />
        <Metric label="OZO stavke" value={ozo.length} />
        <Metric label="Upozorenja" value={kriticno + uskoro} tone={kriticno > 0 ? "danger" : uskoro > 0 ? "warning" : "ok"} />
      </section>

      <section style={mainGridStyle}>
        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Osnovni podaci</h2>
          <div style={detailsGridStyle}>
            <Detail label="Tvrtka" value={tvrtka.naziv} />
            <Detail label="Status" value={radnik.aktivan ? "Aktivan" : "Neaktivan"} />
            <Detail label="Datum zaposlenja" value={formatHrDate(radnik.datumZaposlenja)} />
            <Detail label="Datum odjave" value={formatHrDate(radnik.datumOdjave)} />
            <Detail label="Datum rođenja" value={formatHrDate(radnik.datumRodjenja)} />
            <Detail label="Grad / mjesto" value={radnik.grad || "-"} />
            <Detail label="Radno mjesto" value={radnik.radnoMjesto || "-"} />
            <Detail label="OIB" value={radnik.oib} />
          </div>
        </div>

        <div style={panelStyle}>
          <h2 style={panelTitleStyle}>Dozvole i osposobljenost</h2>
          <div style={timelineStyle}>
            <TimelineItem
              title="Radna dozvola"
              detail={radnik.imaDozvolu ? deadlineText(radnik.dozvolaDo) : "Nije označeno da ima dozvolu"}
              date={formatHrDate(radnik.dozvolaDo)}
              status={radnik.imaDozvolu ? deadlineStatus(radnik.dozvolaDo) : "muted"}
            />
            <TimelineItem
              title="ZNR osposobljen"
              detail={radnik.znrOsposobljen ? "Osposobljen" : "Nije osposobljen"}
              date={formatHrDate(radnik.znrDatum)}
              status={radnik.znrOsposobljen ? "ok" : "muted"}
            />
            <TimelineItem
              title="ZOP osposobljen"
              detail={radnik.zopOsposobljen ? "Osposobljen" : "Nije osposobljen"}
              date={formatHrDate(radnik.zopDatum)}
              status={radnik.zopOsposobljen ? "ok" : "muted"}
            />
          </div>
        </div>
      </section>

      <section style={recordsGridStyle}>
        <RecordPanel
          title="Liječnički pregledi"
          empty="Nema liječničkih pregleda."
        >
          {lijecnicki.map((item) => (
            <RecordRow
              key={item.id}
              title={item.vrsta || "Pregled"}
              meta={item.napomena || "Bez napomene"}
              dateLabel="Vrijedi do"
              date={item.vrijediDo}
              status={deadlineStatus(item.vrijediDo)}
            />
          ))}
        </RecordPanel>

        <RecordPanel
          title="Osposobljavanja"
          empty="Nema osposobljavanja."
        >
          {osposobljavanja.map((item) => (
            <RecordRow
              key={item.id}
              title={item.vrsta}
              meta={item.napomena || `Datum: ${formatHrDate(item.datum)}`}
              dateLabel="Vrijedi do"
              date={item.vrijediDo}
              status={deadlineStatus(item.vrijediDo)}
            />
          ))}
        </RecordPanel>

        <RecordPanel title="OZO oprema" empty="Nema zadužene OZO opreme.">
          {ozo.map((item) => (
            <RecordRow
              key={item.id}
              title={item.vrsta}
              meta={`Količina: ${item.kolicina}${item.napomena ? ` · ${item.napomena}` : ""}`}
              dateLabel="Rok zamjene"
              date={item.rokZamjene}
              status={deadlineStatus(item.rokZamjene)}
            />
          ))}
        </RecordPanel>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "danger" | "warning" | "ok";
}) {
  return (
    <div style={metricStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div
        style={{
          ...metricValueStyle,
          ...(tone === "danger" ? dangerTextStyle : {}),
          ...(tone === "warning" ? warningTextStyle : {}),
          ...(tone === "ok" ? okTextStyle : {}),
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TimelineItem({
  title,
  detail,
  date,
  status,
}: {
  title: string;
  detail: string;
  date: string;
  status: DeadlineStatus;
}) {
  return (
    <div style={timelineItemStyle}>
      <div>
        <div style={recordTitleStyle}>{title}</div>
        <div style={recordMetaStyle}>{detail}</div>
      </div>
      <div style={timelineRightStyle}>
        <span style={statusStyle(status)}>{status === "ok" ? "Uredno" : status === "warning" ? "Uskoro" : status === "expired" ? "Isteklo" : "Info"}</span>
        <span style={dateStyle}>{date}</span>
      </div>
    </div>
  );
}

function RecordPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;

  return (
    <div style={panelStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      <div style={recordsListStyle}>
        {isEmpty ? <div style={emptyStyle}>{empty}</div> : children}
      </div>
    </div>
  );
}

function RecordRow({
  title,
  meta,
  dateLabel,
  date,
  status,
}: {
  title: string;
  meta: string;
  dateLabel: string;
  date: Date | null;
  status: DeadlineStatus;
}) {
  return (
    <div style={recordRowStyle}>
      <div style={recordMainStyle}>
        <div style={recordTitleStyle}>{title}</div>
        <div style={recordMetaStyle}>{meta}</div>
      </div>
      <div style={recordDateStyle}>
        <span>{dateLabel}</span>
        <strong>{formatHrDate(date)}</strong>
        <em>{deadlineText(date)}</em>
      </div>
      <span style={statusStyle(status)}>
        {status === "ok"
          ? "Uredno"
          : status === "warning"
          ? "Uskoro"
          : status === "expired"
          ? "Isteklo"
          : "Info"}
      </span>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const topNavStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const backLinkStyle: React.CSSProperties = {
  color: "#0f766e",
  textDecoration: "none",
  fontWeight: 900,
};

const plainLinkStyle: React.CSSProperties = {
  color: "#64748b",
  textDecoration: "none",
  fontWeight: 800,
};

const heroStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "center",
  gap: 18,
  padding: 22,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
};

const avatarStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 8,
  background: "#0f2747",
  color: "#6ee7b7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 24,
  fontWeight: 900,
};

const heroMainStyle: React.CSSProperties = {
  minWidth: 0,
};

const eyebrowStyle: React.CSSProperties = {
  color: "#0f766e",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "5px 0 7px",
  fontSize: 34,
  lineHeight: 1.1,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 15,
};

const statsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const metricStyle: React.CSSProperties = {
  minHeight: 100,
  padding: 16,
  borderRadius: 8,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  display: "grid",
  alignContent: "space-between",
};

const metricLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
};

const metricValueStyle: React.CSSProperties = {
  fontSize: 34,
  lineHeight: 1,
  fontWeight: 900,
  color: "#0f172a",
};

const dangerTextStyle: React.CSSProperties = {
  color: "#dc2626",
};

const warningTextStyle: React.CSSProperties = {
  color: "#b45309",
};

const okTextStyle: React.CSSProperties = {
  color: "#0f766e",
};

const mainGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 18,
};

const recordsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 18,
};

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 18,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
};

const panelTitleStyle: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 18,
  color: "#0f172a",
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
};

const detailStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  padding: 12,
  borderRadius: 8,
  background: "#f8fafc",
  color: "#334155",
};

const timelineStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const timelineItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "center",
  padding: "12px 0",
  borderTop: "1px solid #eef2f7",
};

const timelineRightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const recordsListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const recordRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  alignItems: "center",
  padding: "12px 0",
  borderTop: "1px solid #eef2f7",
};

const recordMainStyle: React.CSSProperties = {
  minWidth: 0,
};

const recordTitleStyle: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 900,
};

const recordMetaStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
};

const recordDateStyle: React.CSSProperties = {
  display: "grid",
  gap: 3,
  textAlign: "right",
  color: "#64748b",
  fontSize: 12,
};

const dateStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: 13,
  fontWeight: 800,
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 72,
  padding: "6px 9px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const okPillStyle: React.CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
};

const warningPillStyle: React.CSSProperties = {
  background: "#fef3c7",
  color: "#92400e",
};

const expiredPillStyle: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
};

const mutedPillStyle: React.CSSProperties = {
  background: "#e2e8f0",
  color: "#475569",
};

const emptyStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 8,
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 700,
};

