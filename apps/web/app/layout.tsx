import type { Metadata } from "next";
import localFont from "next/font/local";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { getInitialFontSizePreference } from "../auth";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Ats - Talento con proposito",
  description: "Plataforma moderna para conectar talento con oportunidades reales.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialFontSize = await getInitialFontSizePreference()

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}>
        <Providers initialFontSize={initialFontSize}>{children}</Providers>
      </body>
    </html>
  );
}
