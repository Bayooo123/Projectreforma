import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./globals.css";
import AppLayout from '@/components/layout/AppLayout';
import PageTransition from "@/components/layout/PageTransition";
import NextTopLoader from 'nextjs-toploader';
import { auth } from "@/auth";
import { getCurrentUserWithWorkspace } from "@/lib/workspace";
import { SessionProvider } from "next-auth/react";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ReformaOS | Legal Operating System",
  description: "Intelligent digital operating system for law firms",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;

  // Fetch user's workspace with owner info if authenticated
  let workspaceData = null;
  if (user?.id) {
    const data = await getCurrentUserWithWorkspace();
    workspaceData = data?.workspace;
  }

  return (
    <html lang="en">
      <body className={inter.variable}>
        <NextTopLoader
          color="#2C3E50"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <SessionProvider session={session}>
          {user ? (
            // Authenticated layout with AppLayout Grid
            <AppLayout user={user} workspace={workspaceData}>
              <PageTransition>
                {children}
              </PageTransition>
            </AppLayout>
          ) : (
            // Unauthenticated layout (auth pages handle their own layout)
            <PageTransition>
              {children}
            </PageTransition>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
