import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    // Protect dashboard and all sub-pages
    "/dashboard/:path*",
    // Protect sensitive API routes
    "/api/parse-file",
    "/api/autopilot/:path*",
    "/api/db/:path*",
  ],
};
