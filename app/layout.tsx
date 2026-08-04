import type { Metadata, Viewport } from "next";
import "./globals.css";

const title = "Money Elite — Finanze personali";
const description = "La tua app privata per conti, transazioni, budget e risparmi.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://marcodagostino94.github.io/Money-elite/"),
  title,
  description,
  icons: { icon: "./money-elite-icon.png", shortcut: "./money-elite-icon.png", apple: "./money-elite-icon.png" },
  openGraph: { title, description, type: "website", images: [{ url: "./og.png", width: 1200, height: 630, alt: "Money Elite" }] },
  twitter: { card: "summary_large_image", title, description, images: ["./og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
