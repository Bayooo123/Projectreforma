import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

import AppLayout from '@/components/layout/AppLayout';
import PageTransition from "@/components/layout/PageTransition";
import NextTopLoader from 'nextjs-toploader';
import { auth } from "@/auth";
import { getCurrentUserWithWorkspace } from "@/lib/workspace";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

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
    <html lang="en" suppressHydrationWarning>
      <body className={dmSans.variable}>
        <NextTopLoader
          color="#0f766e"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
        </ThemeProvider>
      </body>
    </html>
  );
}

