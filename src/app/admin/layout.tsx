import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sessionHasAdminAccess } from "@/lib/auth/admins";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession().catch(() => null);
  const allowed = await sessionHasAdminAccess(session);

  if (!allowed) {
    redirect("/profile");
  }

  return <AdminShell>{children}</AdminShell>;
}
