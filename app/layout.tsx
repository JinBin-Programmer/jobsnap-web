import type { Metadata, Viewport } from "next";
import { Public_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Public Sans for all UI text, IBM Plex Mono exclusively for stamped data
// (GPS coordinates, timestamps, elapsed counters) — per the design handoff.
// Both are widely-used, well-tested Google Fonts.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | JobSnap",
    default: "JobSnap — Photo Proof of Work for Field Service Teams",
  },
  description:
    "For aircond, pest control, cleaning & maintenance companies in Malaysia. Workers snap photo proof with GPS on-site; you send clients a clean PDF report in one click — no more digging through WhatsApp groups.",
  openGraph: {
    type: "website",
    siteName: "JobSnap",
    title: "JobSnap — Photo Proof of Work for Field Service Teams",
    description:
      "Workers snap photo proof with GPS on-site. You send clients a clean PDF report in one click.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0f11",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${publicSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
