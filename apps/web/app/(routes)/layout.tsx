import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import SessionWrapper from "../components/SessionWrapper";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "Mesh Supply Chain | Telemetry & Operations Grid",
  description: "Modern telemetry and multi-facility supply chain management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionWrapper>
      <html lang="en" className={`${archivo.variable} bg-[#F3F4F7] antialiased`}>
        <body className="font-sans bg-[#F3F4F7] text-[#222026] min-h-screen">
          {children}
        </body>
      </html>
    </SessionWrapper>
  );
}
