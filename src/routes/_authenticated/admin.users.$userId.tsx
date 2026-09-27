import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminKpiCard, AdminPageHeader, EmptyState, ErrorState, KV, LoadingState, Section, StatusBadge, adminHead, adminRpc, fmtDate, fmtDateTime } from "@/components/admin/ui";
import { EventsList, type Ev, type Stats } from "./admin.cards.$cardId";
import { profileUrl } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/users/$userId")({
  head: adminHead("User details"),
  component: UserDetails,
});

type Detail = {
  profile: { id: string; user_id: string; slug: string; full_name: string | null; email: string | null; job_title: string | null; company: string | null;
    is_public: boolean; created_at: string; updated_at: string; incomplete: boolean };
  roles: string[]; cards: { id: string; card_code: string; status: string; created_at: string; activated_at: string | null }[]; stats: Stats; events: Ev[];
};

function UserDetails() {
  const { userId } = Route.useParams();
  const d = useQuery({ queryKey: ["admin-user", userId], queryFn: () => adminRpc<Detail | null>("admin_user_details", { p_user_id: userId }) });
  if (d.isLoading) return <LoadingState />;
  if (d.error) return <ErrorState error={d.error} onRetry={() => d.refetch()} />;
  if (!d.data) return <EmptyState title="User not found" />;
  const { profile: p, roles, cards, stats, events } = d.data;
  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost"><Link to="/admin/users"><ArrowLeft className="mr-1 h-4 w-4" />Users</Link></Button>
      <AdminPageHeader title={p.full_name || p.email || p.slug} subtitle={p.email ?? undefined}
        actions={<Button asChild size="sm" variant="outline"><a href={profileUrl(p.slug)} target="_blank" rel="noreferrer">Open public profile</a></Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Account">
          <KV items={[["Email", p.email], ["Roles", roles.length ? roles.map((r) => <Badge key={r} variant="outline" className="mr-1">{r}</Badge>) : "user"], ["Joined", fmtDateTime(p.created_at)], ["Last update", fmtDateTime(p.updated_at)]]} />
        </Section>
        <Section title="Profile">
          <KV items={[["Slug", `/p/${p.slug}`], ["Job title", p.job_title], ["Company", p.company], ["State", `${p.is_public ? "Public" : "Private"}${p.incomplete ? " · Incomplete" : ""}`]]} />
        </Section>
      </div>
      <Section title="Cards">
        {!cards.length ? <EmptyState title="No cards" /> : (
          <ul className="divide-y divide-border text-sm">{cards.map((c) => (
            <li key={c.id}><Link to="/admin/cards/$cardId" params={{ cardId: c.id }} className="flex items-center justify-between gap-3 py-2">
              <span className="font-mono">{c.card_code}</span><span className="flex items-center gap-3 text-xs text-muted-foreground">{fmtDate(c.created_at)}<StatusBadge status={c.status} /></span>
            </Link></li>
          ))}</ul>
        )}
      </Section>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Views" value={stats.views} /><AdminKpiCard label="QR" value={stats.qr} /><AdminKpiCard label="NFC" value={stats.nfc} /><AdminKpiCard label="Last 30 days" value={stats.last30} />
      </div>
      <Section title="Recent activity"><EventsList events={events} /></Section>
    </div>
  );
}
