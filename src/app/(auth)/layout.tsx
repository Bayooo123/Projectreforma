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
        <div className="relative min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
            </div>
            {children}
        </div>
    );
}
