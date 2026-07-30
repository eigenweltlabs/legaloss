import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/admin-tabs";

export const dynamic = "force-dynamic";

/**
 * Single gate for everything under /admin. 404 rather than 403: the routes'
 * existence is not worth advertising. Server actions re-check admin rights
 * independently, so this is navigation, not the security boundary.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!isAdminUser(userId)) notFound();

  return (
    <div className="container">
      <div className="admin-wide">
        <div className="section-head" style={{ marginBottom: 20 }}>
          <span className="eyebrow">Admin</span>
        </div>
        <AdminTabs />
      </div>
      {children}
    </div>
  );
}
