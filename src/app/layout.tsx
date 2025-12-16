import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import PageTransition from "@/components/layout/PageTransition";
import NextTopLoader from 'nextjs-toploader';
import { auth } from "@/auth";
import { getCurrentUserWithWorkspace } from "@/lib/workspace";

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
        {user ? (
          // Authenticated layout with sidebar and header
          <div className="flex">
            <Sidebar user={user} />
            <main style={{ marginLeft: '260px', width: 'calc(100% - 260px)', minHeight: '100vh' }}>
              <Header user={user} workspace={workspaceData ?? undefined} />
              <div className="container" style={{ padding: '2rem' }}>
                <PageTransition>
                  {children}
                </PageTransition>
              </div>
            </main>
          </div>
        ) : (
          // Unauthenticated layout (auth pages handle their own layout)
          <PageTransition>
            {children}
          </PageTransition>
        )}
      </body>
    </html>
  );
}
