import type { Metadata } from "next";
import AppShell from "./components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZNR aplikacija",
  description: "Aplikacija za zaštitu na radu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}