import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminDataTable, AdminPageHeader, adminHead, adminRpc, fmtDate } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  head: adminHead("Admin Users"),
  component: Admins,
});

type Row = { user_id: string; role: string; granted_at: string; full_name: string | null; email: string | null; slug: string | null };

function Admins() {
  const list = useQuery({ queryKey: ["admin-admins"], queryFn: () => adminRpc<Row[]>("admin_list_admins") });
  return (
    <div>
      <AdminPageHeader title="Admin Users" subtitle="Accounts with full admin access. Contact support to grant or revoke admin access." />
      <AdminDataTable loading={list.isLoading} error={list.error} onRetry={() => list.refetch()} rows={list.data} rowKey={(r) => r.user_id}
        columns={[
          { header: "Name", cell: (r) => r.full_name || "—" }, { header: "Email", cell: (r) => r.email ?? "—" },
          { header: "Role", cell: (r) => r.role }, { header: "Granted", cell: (r) => fmtDate(r.granted_at) },
        ]} />
    </div>
  );
}
