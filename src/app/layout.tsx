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
  viewportFit: "cover",
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

  const sanitizeColor = (c: string | null | undefined, fallback: string) =>
    c && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fallback;

  // Resolve theme: personal overrides workspace if user opted in
  let resolvedAccentColor = sanitizeColor((workspaceData as any)?.accentColor, '#3182ce');
  let resolvedSecondaryColor = sanitizeColor((workspaceData as any)?.secondaryColor, '#1e293b');
  let resolvedBrandColor = sanitizeColor((workspaceData as any)?.brandColor, '#121826');

  if (user?.id) {
    try {
      const { prisma: db } = await import('@/lib/prisma');
      const userTheme = await db.user.findUnique({
        where: { id: user.id },
        select: { themeSource: true, personalAccentColor: true, personalSecondaryColor: true, personalBrandColor: true },
      });
      if (userTheme?.themeSource === 'personal') {
        if (userTheme.personalAccentColor) resolvedAccentColor = userTheme.personalAccentColor;
        if (userTheme.personalSecondaryColor) resolvedSecondaryColor = userTheme.personalSecondaryColor;
        if (userTheme.personalBrandColor) resolvedBrandColor = userTheme.personalBrandColor;
      }
    } catch { /* non-fatal */ }
  }

  // Resolve pathname server-side to avoid client-side layout toggling
  const rawPathname = headersList.get('x-pathname') || '';
  const pathname = rawPathname.replace(/\/$/, '') || '/'; // Normalize trailing slash

  const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/join', '/landing'];
  const isPublicRoute =
    PUBLIC_ROUTES.includes(pathname) ||
    pathname.startsWith('/join/');

  // Routes that are authenticated but intentionally chrome-free (no sidebar/header shell)
  const CHROMELESS_ROUTES: string[] = [];
  const isChromelessRoute =
    CHROMELESS_ROUTES.includes(pathname) ||
    CHROMELESS_ROUTES.some(r => pathname.startsWith(r + '/')) ||
    pathname.startsWith('/admin');

  // Determine if we should render the app shell
  const showShell = !!user && !isPublicRoute && !isChromelessRoute;

  // Inject workspace colors directly into :root so they override globals.css defaults.
  // Using a <style> tag on :root is more reliable than inline style on <body> because
  // globals.css defines --primary/--bg-sidebar as var(--accent-color) on :root — if the
  // source variable is only on <body>, browsers resolve it fine but some edge cases (dark
  // mode class overrides, ThemeProvider) can interfere. This approach is unambiguous.
  const workspaceColorStyle = `
    :root {
      --accent-color: ${resolvedAccentColor};
      --secondary-color: ${resolvedSecondaryColor};
      --brand-color: ${resolvedBrandColor};
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${sourceSerif4.variable}`}
        style={{ minHeight: '100%' }}
      >
        {/* Workspace colour overrides — injected per-request from DB, targets :root */}
        <style dangerouslySetInnerHTML={{ __html: workspaceColorStyle }} />
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
