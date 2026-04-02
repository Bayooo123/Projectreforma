import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Reforma | Legal Practice Management",
    description: "Modern legal practice management for forward-thinking law firms",
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen bg-surface-subtle transition-colors duration-300">
            {children}
        </div>
    );
}
