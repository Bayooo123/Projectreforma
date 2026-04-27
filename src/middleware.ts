import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    // 1. Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production') {
        const proto = req.headers.get('x-forwarded-proto');
        if (proto === 'http') {
            const httpsUrl = `https://${req.headers.get('host')}${req.nextUrl.pathname}${req.nextUrl.search}`;
            return NextResponse.redirect(httpsUrl, 308);
        }
    }

    // 2. Inject the current pathname into request headers so RootLayout (Server Component) can read it
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', req.nextUrl.pathname);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        }
    });
});

export const config = {
    // Protect all routes except public ones
    matcher: [
        /*
         * Match all request paths except:
         * - api/auth (auth endpoints)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (public files)
         * - images and other static assets
         */
        '/((?!api/auth|api/email/inbound|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
    ],
};
