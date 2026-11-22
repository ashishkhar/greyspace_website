import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "../styles/globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Greyspaces — Your space, visualized",
  description:
    "A private, curated design experience. Explore concepts and share what resonates—in your own time.",
  manifest: "/manifest.json",
  applicationName: "Grey Spaces",
  appleWebApp: { title: "Grey Spaces", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-charcoal-950 font-sans text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
