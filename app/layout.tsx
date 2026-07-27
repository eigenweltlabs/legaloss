import type { Metadata, Viewport } from "next";
import { sql } from "drizzle-orm";
import { Big_Shoulders, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/lib/admin";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { db } from "@/lib/db";
import { projectStats } from "@/lib/db/schema";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ConsentBanner } from "@/components/consent-banner";
import { NewsletterModal } from "@/components/newsletter-modal";
import { PostHogAnalytics } from "@/components/posthog-analytics";
import "./globals.css";

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-big-shoulders",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets fixed elements extend into the notch/home-indicator areas, which
  // the safe-area insets in globals.css then account for.
  viewportFit: "cover",
  themeColor: "#F8F6F0",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LegalOSS · Open Source Legal Software",
    template: "%s · LegalOSS",
  },
  description:
    "A community index of open-source legal software. Live GitHub stats, community reviews, maintainer-claimed pages.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    title: "LegalOSS · Open Source Legal Software",
    description:
      "A community index of open-source legal software. Live GitHub stats, community reviews, maintainer-claimed pages.",
  },
  twitter: {
    card: "summary",
    title: "LegalOSS · Open Source Legal Software",
    description:
      "A community index of open-source legal software. Live GitHub stats, community reviews, maintainer-claimed pages.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let trackedStars = 0;
  try {
    const agg = await db
      .select({ total: sql<number>`coalesce(sum(${projectStats.stars}), 0)` })
      .from(projectStats);
    trackedStars = Number(agg[0]?.total ?? 0);
  } catch {
    // Unmigrated database (static prerender during `next build`): render the
    // shell without the stat instead of failing the build.
  }

  let isAdmin = false;
  try {
    const { userId } = await auth();
    isAdmin = isAdminUser(userId);
  } catch {
    // Prerender without a request scope: render the public header.
  }
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html
        lang="en"
        className={`${bigShoulders.variable} ${jetbrains.variable} ${inter.variable}`}
      >
        <body>
          <SiteHeader trackedStars={trackedStars} isAdmin={isAdmin} />
          <main>{children}</main>
          <SiteFooter />
          <ConsentBanner />
          <NewsletterModal />
          <PostHogAnalytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
