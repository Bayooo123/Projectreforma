import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

import ShellWrapper from "@/components/layout/ShellWrapper";
import PageTransition from "@/components/layout/PageTransition";
import NextTopLoader from 'nextjs-toploader';
import { getCurrentUserWithWorkspace } from "@/lib/workspace";
import PWAInstallPrompt from "@/components/layout/PWAInstallPrompt";
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f766e",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Single cached call — child pages calling getCurrentUserWithWorkspace() get a cache hit
  const [userData, headersList] = await Promise.all([
    getCurrentUserWithWorkspace(),
    headers(),
  ]);
  const user = userData?.user;
  const workspaceData = userData?.workspace;

  // Resolve pathname server-side to avoid client-side layout toggling
  const rawPathname = headersList.get('x-pathname') || '';
  const pathname = rawPathname.replace(/\/$/, '') || '/'; // Normalize trailing slash

  const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/join', '/landing'];
  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/join/');

  // Routes that are authenticated but intentionally chrome-free (no sidebar/header shell)
  const CHROMELESS_ROUTES = ['/chat'];
  const isChromelessRoute =
    CHROMELESS_ROUTES.includes(pathname) ||
    CHROMELESS_ROUTES.some(r => pathname.startsWith(r + '/')) ||
    pathname.startsWith('/admin');

  // Determine if we should render the app shell
  const showShell = !!user && !isPublicRoute && !isChromelessRoute;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${sourceSerif4.variable}`}
        style={{
          ['--brand-color' as any]: (workspaceData as any)?.brandColor || '#121826',
          ['--secondary-color' as any]: (workspaceData as any)?.secondaryColor || '#1e293b',
          ['--accent-color' as any]: (workspaceData as any)?.accentColor || '#3182ce',
          minHeight: '100vh'
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
          <SessionProvider>
            {showShell ? (
              // Authenticated shell — workspace parameter is now lightweight
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
            <PWAInstallPrompt />
          </body>
        </html>
  );
}
