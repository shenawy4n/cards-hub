import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AdminDataTable, AdminFilters, AdminPageHeader, ExportCsvButton, PAGE_SIZE, Pager, adminHead, adminRpc, fmtDate, type Column, type Paged } from "@/components/admin/ui";
import { useDebounced } from "./admin.cards.index";

export const Route = createFileRoute("/_authenticated/admin/users/")({
  head: adminHead("Users"),
  component: () => <ProfilesList mode="users" />,
});

export type ProfileRow = { id: string; user_id: string; slug: string; full_name: string | null; email: string | null; job_title: string | null; company: string | null;
  is_public: boolean; incomplete: boolean; created_at: string; cards: number; active_cards: number; views: number; last_activity: string | null };

export function ProfilesList({ mode }: { mode: "users" | "profiles" }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [vis, setVis] = useState("all");
  const [comp, setComp] = useState("all");
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(0);
  const dq = useDebounced(q);
  useEffect(() => setPage(0), [dq, vis, comp, sort]);
  const args = { p_search: dq || null, p_visibility: vis === "all" ? null : vis, p_completeness: comp === "all" ? null : comp, p_sort: sort };
  const list = useQuery({
    queryKey: ["admin-profiles", args, page], placeholderData: keepPreviousData,
    queryFn: () => adminRpc<Paged<ProfileRow>>("admin_list_profiles", { ...args, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }),
  });
  const name: Column<ProfileRow> = { header: mode === "users" ? "User" : "Owner", cell: (r) => r.full_name || <span className="text-muted-foreground">Unnamed</span> };
  const columns: Column<ProfileRow>[] = mode === "users" ? [
    name, { header: "Email", cell: (r) => r.email ?? "—" }, { header: "Profile", cell: (r) => <span className="text-muted-foreground">/p/{r.slug}</span>, mobileHidden: true },
    { header: "Cards", cell: (r) => `${r.active_cards}/${r.cards} active` }, { header: "Views", cell: (r) => r.views },
    { header: "Created", cell: (r) => fmtDate(r.created_at) }, { header: "Last activity", cell: (r) => fmtDate(r.last_activity), mobileHidden: true },
  ] : [
    name, { header: "Profile", cell: (r) => <span className="text-muted-foreground">/p/{r.slug}</span> },
    { header: "Company", cell: (r) => r.company ?? "—", mobileHidden: true }, { header: "Job title", cell: (r) => r.job_title ?? "—", mobileHidden: true },
    { header: "State", cell: (r) => <span className="flex justify-end gap-1 md:justify-start"><Badge variant="outline">{r.is_public ? "Public" : "Private"}</Badge>{r.incomplete && <Badge variant="outline" className="border-warning/40 text-warning">Incomplete</Badge>}</span> },
    { header: "Created", cell: (r) => fmtDate(r.created_at) }, { header: "Last activity", cell: (r) => fmtDate(r.last_activity), mobileHidden: true },
  ];
  const fields: (keyof ProfileRow & string)[] = ["full_name", "email", "slug", "job_title", "company", "is_public", "incomplete", "cards", "active_cards", "views", "created_at", "last_activity"];

  return (
    <div>
      <AdminPageHeader title={mode === "users" ? "Users" : "Profiles"} subtitle={mode === "users" ? "Accounts, their cards and activity." : "Public digital profiles."}
        actions={<ExportCsvButton filename={mode} fields={fields} fetchAll={async () => (await adminRpc<Paged<ProfileRow>>("admin_list_profiles", { ...args, p_limit: 5000, p_offset: 0 })).rows} />} />
      <AdminFilters>
        <Input placeholder="Search name, email, slug, company…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" />
        <Select value={vis} onValueChange={setVis}><SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Any visibility</SelectItem><SelectItem value="public">Public</SelectItem><SelectItem value="private">Private</SelectItem></SelectContent></Select>
        <Select value={comp} onValueChange={setComp}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Any completeness</SelectItem><SelectItem value="complete">Complete</SelectItem><SelectItem value="incomplete">Incomplete</SelectItem></SelectContent></Select>
        <Select value={sort} onValueChange={setSort}><SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="desc">Newest first</SelectItem><SelectItem value="asc">Oldest first</SelectItem></SelectContent></Select>
      </AdminFilters>
      <AdminDataTable loading={list.isLoading} error={list.error} onRetry={() => list.refetch()} rows={list.data?.rows} rowKey={(r) => r.id}
        onRowClick={(r) => navigate({ to: "/admin/users/$userId", params: { userId: r.user_id } })} columns={columns} />
      {list.data && <Pager page={page} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
