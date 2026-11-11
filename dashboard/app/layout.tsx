import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FACEIT Analyse",
  description: "CS2-statistik, form, maps og utility fra officielle FACEIT-data.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className="antialiased">{children}</body>
    </html>
  );
}
