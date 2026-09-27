import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDataTable, AdminFilters, AdminPageHeader, EVENT_LABELS, ExportCsvButton, PAGE_SIZE, Pager, adminHead, adminRpc, fmtDateTime, type Paged } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/activity")({
  head: adminHead("Activity"),
  component: ActivityPage,
});

type Row = { kind: string; at: string; user_id: string | null; full_name: string | null; slug: string | null; card_code: string | null; card_id: string | null; detail: string | null };

function ActivityPage() {
  const navigate = useNavigate();
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [type, from, to]);
  const args = { p_type: type === "all" ? null : type, p_from: from ? new Date(from).toISOString() : null, p_to: to ? new Date(to).toISOString() : null };
  const list = useQuery({
    queryKey: ["admin-activity", args, page], placeholderData: keepPreviousData,
    queryFn: () => adminRpc<Paged<Row>>("admin_activity", { ...args, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
  });
  return (
    <div>
      <AdminPageHeader title="Activity" subtitle="Visits, card events and profile changes (visits: last 90 days unless a date is set)."
        actions={<ExportCsvButton filename="activity" fields={["kind", "at", "full_name", "slug", "card_code", "detail"]}
          fetchAll={async () => (await adminRpc<Paged<Row>>("admin_activity", { ...args, p_limit: 200, p_offset: 0 })).rows} />} />
      <AdminFilters>
        <Select value={type} onValueChange={setType}><SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All events</SelectItem>{Object.entries(EVENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-40" aria-label="From" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="sm:w-40" aria-label="To" />
      </AdminFilters>
      <AdminDataTable loading={list.isLoading} error={list.error} onRetry={() => list.refetch()} rows={list.data?.rows} rowKey={(r) => `${r.kind}-${r.at}-${r.card_id}-${r.user_id}`}
        onRowClick={(r) => r.card_id ? navigate({ to: "/admin/cards/$cardId", params: { cardId: r.card_id } }) : r.user_id && navigate({ to: "/admin/users/$userId", params: { userId: r.user_id } })}
        columns={[
          { header: "Event", cell: (r) => EVENT_LABELS[r.kind] ?? r.kind },
          { header: "Card", cell: (r) => <span className="font-mono">{r.card_code ?? "—"}</span> },
          { header: "Profile", cell: (r) => r.full_name || (r.slug ? `/p/${r.slug}` : "—") },
          { header: "Source", cell: (r) => <span className="uppercase text-xs text-muted-foreground">{r.kind === "profile_view" || r.kind === "card_redirect" ? r.detail : "—"}</span> },
          { header: "When", cell: (r) => fmtDateTime(r.at) },
        ]} />
      {list.data && <Pager page={page} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
