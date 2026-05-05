import Link from "next/link";

export default function Page() {
  return (
    <div style={{ padding: 40 }}>
      <h1>ZNR aplikacija</h1>

      <p>Radi 🎉</p>

      <Link href="/tvrtke">Idi na tvrtke</Link>
    </div>
  );
}
