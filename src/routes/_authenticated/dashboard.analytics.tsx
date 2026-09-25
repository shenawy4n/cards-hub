import { createFileRoute } from "@tanstack/react-router";
import { Loading, PageTitle, Stat } from "@/components/dashboard/Stat";
import { useMyAnalytics, useMyProfile } from "@/hooks/useMyData";

export const Route = createFileRoute("/_authenticated/dashboard/analytics")({
  component: Analytics,
});

function Analytics() {
  const profile = useMyProfile();
  const { data } = useMyAnalytics(profile.data?.id);
  if (!data) return <Loading />;
  const max = Math.max(1, ...data.daily.map((d) => d.views));

  return (
    <div className="space-y-8">
      <PageTitle title="Analytics" subtitle="How people reach your profile." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Total views" value={data.totalViews} />
        <Stat label="Last 7 days" value={data.last7} />
        <Stat label="Last 30 days" value={data.last30} />
        <Stat label="QR" value={data.qr} />
        <Stat label="NFC" value={data.nfc} />
        <Stat label="Direct" value={data.direct} />
      </div>
      <div className="rounded-xl border border-border p-5">
        <h2 className="mb-4 font-display font-semibold text-foreground">Views — last 7 days</h2>
        <div className="flex h-40 items-end gap-2">
          {data.daily.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t bg-primary" style={{ height: `${(d.views / max) * 100}%`, minHeight: 2 }} />
              <span className="text-[10px] text-muted-foreground">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-border p-5">
        <h2 className="mb-3 font-display font-semibold text-foreground">Recent activity</h2>
        {data.recent.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
          <ul className="divide-y divide-border text-sm">
            {data.recent.map((e) => (
              <li key={e.id} className="flex justify-between py-2">
                <span className="text-foreground">{e.event_type === "profile_view" ? "Profile view" : "Card tap/scan"} · <span className="uppercase text-muted-foreground">{e.source}</span></span>
                <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
