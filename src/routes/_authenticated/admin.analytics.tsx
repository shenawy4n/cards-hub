import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { AdminKpiCard, AdminPageHeader, EmptyState, ErrorState, LoadingState, Section, adminHead, adminRpc } from "@/components/admin/ui";
import { RangeSwitch, ViewsChart, useTimeseries } from "./admin.index";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: adminHead("Analytics"),
  component: Analytics,
});

type Sum = { views: number; redirects: number; qr: number; nfc: number; direct: number;
  top_cards: { id: string; card_code: string; total: number }[]; top_profiles: { user_id: string; slug: string; full_name: string | null; total: number }[] };

function Analytics() {
  const [days, setDays] = useState(30);
  const ts = useTimeseries(days);
  const sum = useQuery({
    queryKey: ["admin-sum", days],
    queryFn: () => adminRpc<Sum>("admin_analytics_summary", { p_from: subDays(new Date(), days - 1).toISOString(), p_to: new Date().toISOString() }),
  });
  const s = sum.data;
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Analytics" subtitle="Aggregated server-side from recorded visits." actions={<RangeSwitch days={days} onChange={setDays} />} />
      {sum.error ? <ErrorState error={sum.error} onRetry={() => sum.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <AdminKpiCard label="Profile views" value={s?.views} /><AdminKpiCard label="Card opens" value={s?.redirects} />
          <AdminKpiCard label="QR" value={s?.qr} /><AdminKpiCard label="NFC" value={s?.nfc} /><AdminKpiCard label="Direct" value={s?.direct} />
        </div>
      )}
      <Section title="Views & card opens per day">
        {ts.isLoading ? <LoadingState /> : ts.error ? <ErrorState error={ts.error} onRetry={() => ts.refetch()} /> : <ViewsChart data={ts.data ?? []} />}
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Top cards">
          {!s ? <LoadingState /> : !s.top_cards.length ? <EmptyState /> : (
            <ul className="divide-y divide-border text-sm">{s.top_cards.map((c) => (
              <li key={c.id}><Link to="/admin/cards/$cardId" params={{ cardId: c.id }} className="flex justify-between py-2"><span className="font-mono">{c.card_code}</span><b>{c.total}</b></Link></li>
            ))}</ul>
          )}
        </Section>
        <Section title="Top profiles">
          {!s ? <LoadingState /> : !s.top_profiles.length ? <EmptyState /> : (
            <ul className="divide-y divide-border text-sm">{s.top_profiles.map((p) => (
              <li key={p.user_id}><Link to="/admin/users/$userId" params={{ userId: p.user_id }} className="flex justify-between py-2"><span>{p.full_name || p.slug}</span><b>{p.total}</b></Link></li>
            ))}</ul>
          )}
        </Section>
      </div>
    </div>
  );
}
