import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { Big_Shoulders, Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
  const agg = await db
    .select({ total: sql<number>`coalesce(sum(${projectStats.stars}), 0)` })
    .from(projectStats);
  const trackedStars = Number(agg[0]?.total ?? 0);
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
          <SiteHeader trackedStars={trackedStars} />
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
