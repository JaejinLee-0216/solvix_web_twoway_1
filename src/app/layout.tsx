import type { Metadata } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "SOLVIX | 수능 수학 AI",
  description: "킬러 문항도 더 이상 두렵지 않게.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} ${sourceSerif.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

