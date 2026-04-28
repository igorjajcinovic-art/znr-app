"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Radnik = {
  id: string;
  ime: string;
  oib: string;
  aktivan: boolean;
  radnoMjesto: string | null;
};

type Lijecnicki = {
  id: string;
  oib: string;
  vrsta: string | null;
  vrijediDo: string;
};

type Osposobljavanje = {
  id: string;
  oib: string;
  vrsta: string;
  vrijediDo: string;
};

type Ozo = {
  id: string;
  oib: string;
  vrsta: string;
  rokZamjene: string | null;
};

export default function RadnikDetaljPage() {
  const params = useParams();

  const firmaId = String(
    Array.isArray(params.id) ? params.id[0] : params.id
  );
  const radnikId = String(
    Array.isArray(params.radnikId)
      ? params.radnikId[0]
      : params.radnikId
  );

  const [radnik, setRadnik] = useState<Radnik | null>(null);
  const [lijecnicki, setLijecnicki] = useState<Lijecnicki[]>([]);
  const [osposobljavanja, setOsposobljavanja] = useState<
    Osposobljavanje[]
  >([]);
  const [ozo, setOzo] = useState<Ozo[]>([]);

  const [loading, setLoading] = useState(true);
  const [greska, setGreska] = useState("");

  useEffect(() => {
    ucitaj();
  }, []);

  const ucitaj = async () => {
    try {
      setLoading(true);

      const radniciRes = await fetch(
        `/api/radnici?firmaId=${firmaId}`
      );
      const lijecnickiRes = await fetch(
        `/api/lijecnicki?firmaId=${firmaId}`
      );
      const osposobljavanjaRes = await fetch(
        `/api/osposobljavanja?firmaId=${firmaId}`
      );
      const ozoRes = await fetch(`/api/oprema?firmaId=${firmaId}`);

      const radnici = await radniciRes.json();
      const radnikData = radnici.find((r: Radnik) => r.id === radnikId);

      if (!radnikData) throw new Error("Radnik nije pronađen");

      setRadnik(radnikData);

      const oib = radnikData.oib;

      const lij = await lijecnickiRes.json();
      const osp = await osposobljavanjaRes.json();
      const oz = await ozoRes.json();

      setLijecnicki(lij.filter((x: any) => x.oib === oib));
      setOsposobljavanja(osp.filter((x: any) => x.oib === oib));
      setOzo(oz.filter((x: any) => x.oib === oib));
    } catch (e: any) {
      setGreska(e.message);
    } finally {
      setLoading(false);
    }
  };

  const daysUntil = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const t = new Date();
    return Math.ceil((d.getTime() - t.getTime()) / 86400000);
  };

  if (loading) return <div style={page}>Učitavanje...</div>;
  if (greska) return <div style={page}>{greska}</div>;
  if (!radnik) return null;

  return (
    <div style={page}>
      <Link href={`/tvrtke/${firmaId}/radnici`}>← Natrag</Link>

      <h1>{radnik.ime}</h1>
      <p>OIB: {radnik.oib}</p>
      <p>Radno mjesto: {radnik.radnoMjesto || "-"}</p>

      <Section title="Liječnički">
        {lijecnicki.map((l) => (
          <Item
            key={l.id}
            naziv={l.vrsta || "Pregled"}
            datum={l.vrijediDo}
            diff={daysUntil(l.vrijediDo)}
          />
        ))}
      </Section>

      <Section title="Osposobljavanja">
        {osposobljavanja.map((o) => (
          <Item
            key={o.id}
            naziv={o.vrsta}
            datum={o.vrijediDo}
            diff={daysUntil(o.vrijediDo)}
          />
        ))}
      </Section>

      <Section title="OZO">
        {ozo.map((o) => (
          <Item
            key={o.id}
            naziv={o.vrsta}
            datum={o.rokZamjene}
            diff={daysUntil(o.rokZamjene)}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div style={{ marginTop: 20 }}>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function Item({ naziv, datum, diff }: any) {
  return (
    <div
      style={{
        padding: 10,
        marginBottom: 8,
        border: "1px solid #ccc",
        borderRadius: 8,
        background:
          diff !== null && diff < 0
            ? "#fee2e2"
            : diff !== null && diff < 7
            ? "#fef3c7"
            : "#f9fafb",
      }}
    >
      <strong>{naziv}</strong>
      <div>{datum}</div>
    </div>
  );
}

const page = {
  padding: 20,
};