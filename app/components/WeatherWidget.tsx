"use client";

import { useEffect, useMemo, useState } from "react";

type WeatherResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    weather_code?: number;
  };
  current_units?: {
    temperature_2m?: string;
    relative_humidity_2m?: string;
    wind_speed_10m?: string;
  };
};

type WeatherState = {
  temp: number;
  humidity: number | null;
  wind: number | null;
  code: number | null;
};

function opisVremena(code: number | null) {
  if (code === null) return "Prognoza";
  if (code === 0) return "Vedro";
  if ([1, 2, 3].includes(code)) return "Djelomicno oblacno";
  if ([45, 48].includes(code)) return "Magla";
  if ([51, 53, 55, 56, 57].includes(code)) return "Rosulja";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Kisa";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snijeg";
  if ([95, 96, 99].includes(code)) return "Grmljavina";
  return "Promjenjivo";
}

function weatherSymbol(code: number | null) {
  if (code === 0) return "SUN";
  if (code !== null && [61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "RAIN";
  if (code !== null && [71, 73, 75, 77, 85, 86].includes(code)) return "SNOW";
  if (code !== null && [95, 96, 99].includes(code)) return "STORM";
  if (code !== null && [45, 48].includes(code)) return "FOG";
  return "SKY";
}

export default function WeatherWidget({ compact = false }: { compact?: boolean }) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        setLoading(true);
        setError(false);

        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=45.3381&longitude=16.0881&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Europe%2FZagreb",
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Weather unavailable");

        const data = (await res.json()) as WeatherResponse;
        const current = data.current;

        if (!current || typeof current.temperature_2m !== "number") {
          throw new Error("Weather missing");
        }

        if (!active) return;

        setWeather({
          temp: current.temperature_2m,
          humidity:
            typeof current.relative_humidity_2m === "number"
              ? current.relative_humidity_2m
              : null,
          wind:
            typeof current.wind_speed_10m === "number"
              ? current.wind_speed_10m
              : null,
          code:
            typeof current.weather_code === "number"
              ? current.weather_code
              : null,
        });
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadWeather();

    return () => {
      active = false;
    };
  }, []);

  const description = useMemo(
    () => opisVremena(weather?.code ?? null),
    [weather?.code]
  );

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("hr-HR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()),
    []
  );

  if (compact) {
    return (
      <div style={compactCardStyle} title="Vremenska prognoza za Glinu">
        <div style={compactDateStyle}>{today}</div>
        {loading ? (
          <div style={compactWeatherStyle}>Vrijeme...</div>
        ) : error || !weather ? (
          <div style={compactWeatherStyle}>Prognoza nedostupna</div>
        ) : (
          <div style={compactWeatherStyle}>
            <strong>{Math.round(weather.temp)} C</strong>
            <span>{description}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={topStyle}>
        <div>
          <h2 style={titleStyle}>Vrijeme</h2>
          <div style={mutedStyle}>Glina, trenutno</div>
        </div>
        <div style={symbolStyle}>{weatherSymbol(weather?.code ?? null)}</div>
      </div>

      {loading ? (
        <div style={emptyStyle}>Ucitavanje prognoze...</div>
      ) : error || !weather ? (
        <div style={emptyStyle}>Prognoza trenutno nije dostupna.</div>
      ) : (
        <>
          <div style={temperatureStyle}>{Math.round(weather.temp)} C</div>
          <div style={descriptionStyle}>{description}</div>
          <div style={detailsStyle}>
            <span>Vjetar: {weather.wind === null ? "-" : `${Math.round(weather.wind)} km/h`}</span>
            <span>Vlaga: {weather.humidity === null ? "-" : `${Math.round(weather.humidity)}%`}</span>
          </div>
        </>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: 18,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
};

const topStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#0f172a",
};

const mutedStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 13,
};

const symbolStyle: React.CSSProperties = {
  minWidth: 54,
  height: 38,
  borderRadius: 8,
  background: "#e0f2fe",
  color: "#075985",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0,
};

const temperatureStyle: React.CSSProperties = {
  fontSize: 42,
  lineHeight: 1,
  fontWeight: 900,
  color: "#0f172a",
};

const descriptionStyle: React.CSSProperties = {
  marginTop: 8,
  color: "#334155",
  fontWeight: 800,
};

const detailsStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const emptyStyle: React.CSSProperties = {
  padding: 14,
  borderRadius: 8,
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 700,
};
const compactCardStyle: React.CSSProperties = {
  display: "grid",
  justifyItems: "end",
  gap: 4,
  color: "#334155",
  fontSize: 12,
  lineHeight: 1.2,
};

const compactDateStyle: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  textTransform: "uppercase",
};

const compactWeatherStyle: React.CSSProperties = {
  display: "flex",
  gap: 7,
  alignItems: "center",
  justifyContent: "flex-end",
  color: "#0f172a",
  fontWeight: 700,
  whiteSpace: "nowrap",
};
