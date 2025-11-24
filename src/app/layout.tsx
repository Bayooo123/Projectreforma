import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ReformaOS | Legal Operating System",
  description: "Intelligent digital operating system for law firms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <div className="flex">
          <Sidebar />
          <main style={{ marginLeft: '260px', width: 'calc(100% - 260px)', minHeight: '100vh' }}>
            <Header />
            <div className="container" style={{ padding: '2rem' }}>
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
