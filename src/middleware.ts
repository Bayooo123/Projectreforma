import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized: ({ token }) => !!token,
    },
});

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
