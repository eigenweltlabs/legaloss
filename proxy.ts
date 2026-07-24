// Next.js 16: request interception lives in proxy.ts (formerly middleware.ts).
// Browsing is public; only submit/account require a session up front. Project
// mutations (star, comment, review, claim, edit) are guarded inside their
// server actions instead, so signed-out visitors can read everything.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CANONICAL_HOST = "legal-oss.com";

const isProtectedRoute = createRouteMatcher(["/submit(.*)", "/account(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Production Clerk only trusts the apex origin; www and the run.app host
  // would leave auth silently broken, so collapse them onto the canonical host.
  const host = req.headers.get("host") ?? "";
  if (
    process.env.NODE_ENV === "production" &&
    host !== CANONICAL_HOST &&
    (host === `www.${CANONICAL_HOST}` || host.endsWith(".run.app"))
  ) {
    const url = new URL(req.url);
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
