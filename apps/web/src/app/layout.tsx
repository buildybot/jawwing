import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "JAWWING - Speak freely. Stay anonymous.",
  description:
    "Anonymous local posts from your neighborhood. No accounts. AI-moderated.",
  metadataBase: new URL("https://jawwing.com"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "JAWWING",
    description: "Anonymous local posts from your neighborhood. No accounts. AI-moderated.",
    url: "https://jawwing.com",
    siteName: "JAWWING",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JAWWING",
    description: "Anonymous local posts from your neighborhood. No accounts. AI-moderated.",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Jawwing",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body
        style={{ background: "#000000", color: "#FFFFFF" }}
        className="font-sans min-h-screen antialiased"
      >
        {children}
      </body>
    </html>
  );
}
