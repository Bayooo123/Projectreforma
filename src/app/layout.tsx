import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  // Fetch user's primary workspace if authenticated
  let workspace = null;
  if (user?.id) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' }, // Get first workspace they joined
    });
    workspace = membership?.workspace;
  }

  return (
    <html lang="en">
      <body className={inter.variable}>
        {user ? (
          // Authenticated layout with sidebar and header
          <div className="flex">
            <Sidebar user={user} />
            <main style={{ marginLeft: '260px', width: 'calc(100% - 260px)', minHeight: '100vh' }}>
              <Header user={user} workspace={workspace} />
              <div className="container" style={{ padding: '2rem' }}>
                {children}
              </div>
            </main>
          </div>
        ) : (
          // Unauthenticated layout (auth pages handle their own layout)
          children
        )}
      </body>
    </html>
  );
}
