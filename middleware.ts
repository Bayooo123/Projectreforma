import NextAuth from "next-auth";
import { authConfig } from "./src/auth.config";

export default NextAuth(authConfig).auth;

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
        '/((?!api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
    ],
};
