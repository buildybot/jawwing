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
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Jawwing — Anonymous. Local. Unfiltered.",
  description:
    "Anonymous local posts from your neighborhood. No sign-up. No tracking. Just your voice.",
  metadataBase: new URL("https://www.jawwing.com"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Jawwing — Anonymous. Local. Unfiltered.",
    description: "Anonymous local posts from your neighborhood. No sign-up. No tracking. Just your voice.",
    url: "https://www.jawwing.com",
    siteName: "Jawwing",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Jawwing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jawwing — Anonymous. Local. Unfiltered.",
    description: "Anonymous local posts from your neighborhood. No sign-up. No tracking. Just your voice.",
    images: ["/logo.png"],
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
