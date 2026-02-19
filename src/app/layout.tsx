import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

import ShellWrapper from "@/components/layout/ShellWrapper";
import PageTransition from "@/components/layout/PageTransition";
import NextTopLoader from 'nextjs-toploader';
import { auth } from "@/auth";
import { getCurrentUserWithWorkspace } from "@/lib/workspace";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-ibm-plex-sans",
  display: 'swap',
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-serif-4",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "ReformaOS | Legal Operating System",
  description: "Intelligent digital operating system for law firms",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user;

  // Resolve pathname server-side to avoid client-side layout toggling
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('referer') || '';
  const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/join'];
  const isPublicRoute =
    PUBLIC_ROUTES.some(r => pathname.endsWith(r)) ||
    pathname.includes('/join/');

  // Fetch user's workspace with owner info if authenticated
  let workspaceData = null;
  if (user?.id) {
    const data = await getCurrentUserWithWorkspace();
    workspaceData = data?.workspace;
  }

  // Determine if we should render the app shell
  // Shell is shown when user is authenticated AND not on a public route
  const showShell = !!user && !isPublicRoute;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${sourceSerif4.variable}`}
        style={{
          ['--brand-color' as any]: (workspaceData as any)?.brandColor || '#8E2F39',
          ['--secondary-color' as any]: (workspaceData as any)?.secondaryColor || '#1e293b',
          ['--accent-color' as any]: (workspaceData as any)?.accentColor || '#3182ce'
        }}
      >
        <NextTopLoader
          color="#0f766e"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={100}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider session={session}>
            {showShell ? (
              // Authenticated shell — structure is deterministic from server
              <ShellWrapper user={user} workspace={workspaceData}>
                <PageTransition>
                  {children}
                </PageTransition>
              </ShellWrapper>
            ) : (
              // Public route — no shell
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
