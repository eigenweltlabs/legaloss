// Next.js 16: request interception lives in proxy.ts (formerly middleware.ts).
// Browsing is public; only submit/account require a session up front. Project
// mutations (star, comment, review, claim, edit) are guarded inside their
// server actions instead, so signed-out visitors can read everything.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/submit(.*)", "/account(.*)"]);

export default clerkMiddleware(async (auth, req) => {
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
