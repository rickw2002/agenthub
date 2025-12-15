import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/workflows/:path*",
    "/library/:path*",
    "/support/:path*",
    "/account/:path*",
    "/data/:path*",
  ],
};

