export default function HomePage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>ZNR aplikacija</h1>

      <ul>
        <li><a href="/tvrtke">Tvrtke</a></li>
        <li><a href="/radnici">Radnici</a></li>
        <li><a href="/lijecnicki">Liječnički</a></li>
        <li><a href="/osposobljavanja">Osposobljavanja</a></li>
        <li><a href="/upozorenja">Upozorenja</a></li>
      </ul>
    </div>
  );
}