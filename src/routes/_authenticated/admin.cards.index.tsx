import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDataTable, AdminFilters, AdminPageHeader, ExportCsvButton, PAGE_SIZE, Pager, StatusBadge, adminHead, adminRpc, fmtDate, type Paged } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/cards/")({
  head: adminHead("Cards"),
  component: Cards,
});

export type CardRow = { id: string; card_code: string; status: string; created_at: string; activated_at: string | null; user_id: string;
  slug: string; full_name: string | null; email: string | null; views: number; qr: number; nfc: number; last_activity: string | null };

export function useDebounced(v: string, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

function Cards() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(0);
  const dq = useDebounced(q);
  useEffect(() => setPage(0), [dq, status, sort]);
  const args = { p_search: dq || null, p_status: status === "all" ? null : status, p_sort: sort };
  const list = useQuery({
    queryKey: ["admin-cards", args, page], placeholderData: keepPreviousData,
    queryFn: () => adminRpc<Paged<CardRow>>("admin_list_cards", { ...args, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
  });

  return (
    <div>
      <AdminPageHeader title="Cards" subtitle="All physical cards and their status."
        actions={<ExportCsvButton filename="cards" fields={["card_code", "status", "full_name", "email", "slug", "created_at", "activated_at", "views", "qr", "nfc", "last_activity"]}
          fetchAll={async () => (await adminRpc<Paged<CardRow>>("admin_list_cards", { ...args, p_limit: 5000, p_offset: 0 })).rows} />} />
      <AdminFilters>
        <Input placeholder="Search code, name, email, slug…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="disabled">Disabled</SelectItem></SelectContent></Select>
        <Select value={sort} onValueChange={setSort}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="desc">Newest first</SelectItem><SelectItem value="asc">Oldest first</SelectItem></SelectContent></Select>
      </AdminFilters>
      <AdminDataTable loading={list.isLoading} error={list.error} onRetry={() => list.refetch()} rows={list.data?.rows} rowKey={(r) => r.id}
        onRowClick={(r) => navigate({ to: "/admin/cards/$cardId", params: { cardId: r.id } })}
        columns={[
          { header: "Card", cell: (r) => <span className="font-mono">{r.card_code}</span> },
          { header: "Owner", cell: (r) => <span>{r.full_name || r.email || "—"}<span className="ml-1 hidden text-xs text-muted-foreground lg:inline">/p/{r.slug}</span></span> },
          { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
          { header: "Created", cell: (r) => fmtDate(r.created_at) },
          { header: "Activated", cell: (r) => fmtDate(r.activated_at), mobileHidden: true },
          { header: "Views", cell: (r) => r.views, className: "text-right" },
        ]} />
      {list.data && <Pager page={page} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
