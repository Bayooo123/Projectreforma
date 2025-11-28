export { default } from "next-auth/middleware";

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/calendar/:path*",
        "/clients/:path*",
        "/matters/:path*",
        "/briefs/:path*",
        "/analytics/:path*",
        "/management/:path*",
    ],
};
