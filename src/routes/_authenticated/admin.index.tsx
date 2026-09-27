import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { Button } from "@/components/ui/button";
import { AdminKpiCard, AdminPageHeader, EmptyState, ErrorState, EVENT_LABELS, fmtDateTime, LoadingState, Section, adminHead, adminRpc, type Paged } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: adminHead("Overview"),
  component: Overview,
});

type Ov = Record<string, number>;
export type TsRow = { date: string; views: number; redirects: number; qr: number; nfc: number; direct: number };
type Act = { kind: string; at: string; full_name: string | null; slug: string | null; card_code: string | null; card_id: string | null; user_id: string | null };

export const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--foreground)", fontSize: 12 };
const PIE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function RangeSwitch({ days, onChange }: { days: number; onChange: (d: number) => void }) {
  return (
    <div className="flex gap-1">
      {[7, 30, 90].map((d) => <Button key={d} size="sm" variant={d === days ? "default" : "outline"} onClick={() => onChange(d)}>{d}d</Button>)}
    </div>
  );
}

export function ViewsChart({ data }: { data: TsRow[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis allowDecimals={false} width={30} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="views" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
          <Area type="monotone" dataKey="redirects" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function useTimeseries(days: number) {
  return useQuery({
    queryKey: ["admin-ts", days],
    queryFn: () => adminRpc<TsRow[]>("admin_timeseries", { p_from: subDays(new Date(), days - 1).toISOString(), p_to: new Date().toISOString() }),
  });
}

function Overview() {
  const [days, setDays] = useState(30);
  const ov = useQuery({ queryKey: ["admin-overview", days], queryFn: () => adminRpc<Ov>("admin_overview", { p_days: days }) });
  const ts = useTimeseries(days);
  const act = useQuery({ queryKey: ["admin-activity-recent"], queryFn: () => adminRpc<Paged<Act>>("admin_activity", { p_limit: 8 }) });
  const o = ov.data;

  const sources = o ? [{ name: "QR", value: o["qr"] ?? 0 }, { name: "NFC", value: o["nfc"] ?? 0 }] : [];
  const statuses = o ? [{ name: "Active", value: o["active"] ?? 0 }, { name: "Pending", value: o["pending"] ?? 0 }, { name: "Disabled", value: o["disabled"] ?? 0 }] : [];
  const attention = o ? [
    { label: "Pending cards", n: o["pending"] ?? 0, to: "/admin/cards" as const },
    { label: "Incomplete profiles", n: o["incomplete_profiles"] ?? 0, to: "/admin/profiles" as const },
    { label: "Disabled cards", n: o["disabled"] ?? 0, to: "/admin/cards" as const },
    { label: "Private profiles with active card", n: o["private_with_active_card"] ?? 0, to: "/admin/profiles" as const },
  ].filter((a) => a.n > 0) : [];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Overview" subtitle={`Platform health — trends compare the last ${days} days with the ${days} before.`} actions={<RangeSwitch days={days} onChange={setDays} />} />
      {ov.error ? <ErrorState error={ov.error} onRetry={() => ov.refetch()} /> : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <AdminKpiCard label="Total users" value={o?.["users"]} cur={o?.["users_cur"]} prev={o?.["users_prev"]} />
          <AdminKpiCard label="Total cards" value={o?.["cards"]} cur={o?.["cards_cur"]} prev={o?.["cards_prev"]} />
          <AdminKpiCard label="Active cards" value={o?.["active"]} />
          <AdminKpiCard label="Pending cards" value={o?.["pending"]} />
          <AdminKpiCard label="Disabled cards" value={o?.["disabled"]} />
          <AdminKpiCard label="Total views" value={o?.["views"]} cur={o?.["views_cur"]} prev={o?.["views_prev"]} />
          <AdminKpiCard label="QR scans" value={o?.["qr"]} cur={o?.["qr_cur"]} prev={o?.["qr_prev"]} />
          <AdminKpiCard label="NFC taps" value={o?.["nfc"]} cur={o?.["nfc_cur"]} prev={o?.["nfc_prev"]} />
        </div>
      )}

      <Section title="Views over time">
        {ts.isLoading ? <LoadingState /> : ts.error ? <ErrorState error={ts.error} onRetry={() => ts.refetch()} /> : <ViewsChart data={ts.data ?? []} />}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Card scans by source">
          {sources.every((s) => !s.value) ? <EmptyState title="No scans yet" /> : (
            <div className="h-48"><ResponsiveContainer><BarChart data={sources} layout="vertical">
              <XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="name" width={40} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} /><Bar dataKey="value" fill="var(--chart-1)" radius={4} />
            </BarChart></ResponsiveContainer></div>
          )}
        </Section>
        <Section title="Card status">
          {statuses.every((s) => !s.value) ? <EmptyState title="No cards yet" /> : (
            <div className="flex items-center gap-6">
              <div className="h-44 w-44"><ResponsiveContainer><PieChart>
                <Pie data={statuses} dataKey="value" innerRadius={45} outerRadius={70} stroke="none">{statuses.map((_, i) => <Cell key={i} fill={PIE[i]} />)}</Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart></ResponsiveContainer></div>
              <ul className="space-y-2 text-sm">{statuses.map((s, i) => <li key={s.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: PIE[i] }} />{s.name}: <b>{s.value}</b></li>)}</ul>
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Needs attention">
          {!o ? <LoadingState /> : attention.length === 0 ? <EmptyState title="All clear" /> : (
            <ul className="divide-y divide-border">{attention.map((a) => (
              <li key={a.label}><Link to={a.to} className="flex items-center justify-between py-2 text-sm hover:text-foreground"><span className="text-muted-foreground">{a.label}</span><b className="text-foreground">{a.n}</b></Link></li>
            ))}</ul>
          )}
        </Section>
        <Section title="Recent activity" action={<Button asChild size="sm" variant="ghost"><Link to="/admin/activity">View all</Link></Button>}>
          {act.isLoading ? <LoadingState /> : act.error ? <ErrorState error={act.error} onRetry={() => act.refetch()} /> : !act.data?.rows.length ? <EmptyState title="No activity yet" /> : (
            <ul className="divide-y divide-border text-sm">{act.data.rows.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate"><span className="text-foreground">{EVENT_LABELS[a.kind] ?? a.kind}</span> <span className="text-muted-foreground">{a.full_name || a.slug || a.card_code || ""}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(a.at)}</span>
              </li>
            ))}</ul>
          )}
        </Section>
      </div>
    </div>
  );
}
