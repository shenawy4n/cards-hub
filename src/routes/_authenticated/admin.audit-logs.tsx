import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AdminDataTable, AdminPageHeader, PAGE_SIZE, Pager, adminHead, adminRpc, fmtDateTime, type Paged } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  head: adminHead("Audit Logs"),
  component: AuditLogs,
});

type Row = { id: string; action: string; target_type: string; target_id: string | null; metadata: Record<string, unknown>; created_at: string; admin_name: string | null; admin_email: string | null };

function AuditLogs() {
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["admin-audit", page], placeholderData: keepPreviousData,
    queryFn: () => adminRpc<Paged<Row>>("admin_audit_logs", { p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
  });
  return (
    <div>
      <AdminPageHeader title="Audit Logs" subtitle="Read-only record of every administrative action." />
      <AdminDataTable loading={list.isLoading} error={list.error} onRetry={() => list.refetch()} rows={list.data?.rows} rowKey={(r) => r.id} empty="No admin actions yet"
        columns={[
          { header: "Admin", cell: (r) => r.admin_name || r.admin_email || "—" },
          { header: "Action", cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { header: "Target", cell: (r) => `${r.target_type}${r.metadata?.["card_code"] ? ` · ${String(r.metadata["card_code"])}` : ""}` },
          { header: "Details", cell: (r) => <span className="text-xs text-muted-foreground">{r.metadata?.["from"] ? `${String(r.metadata["from"])} → ${String(r.metadata["to"])}` : r.target_id}</span>, mobileHidden: true },
          { header: "When", cell: (r) => fmtDateTime(r.created_at) },
        ]} />
      {list.data && <Pager page={page} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
