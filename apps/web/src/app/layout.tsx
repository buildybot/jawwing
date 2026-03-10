import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

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

export const metadata: Metadata = {
  title: "JAWWING — Speak freely. Stay anonymous.",
  description:
    "Location-based anonymous social platform. No human mods. AI-moderated by a public constitution.",
  metadataBase: new URL("https://jawwing.com"),
  openGraph: {
    title: "JAWWING",
    description: "Speak freely. Stay anonymous.",
    url: "https://jawwing.com",
    siteName: "JAWWING",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JAWWING",
    description: "Speak freely. Stay anonymous.",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
