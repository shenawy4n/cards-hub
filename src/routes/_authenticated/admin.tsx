import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loading, PageTitle, Stat } from "@/components/dashboard/Stat";
import { Logo } from "@/components/brand/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useSession";
import { useUser } from "@/hooks/useMyData";
import { setCardStatus } from "@/services/cardService";
import type { CardStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — 4N HUB" },
      { name: "description", content: "4N HUB administration." },
      { property: "og:title", content: "Admin — 4N HUB" },
      { property: "og:description", content: "4N HUB administration." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const user = useUser();
  const { isAdmin, checked } = useIsAdmin(user.id);
  const qc = useQueryClient();
  const stats = useQuery({
    queryKey: ["admin-stats"], enabled: isAdmin,
    queryFn: async () => { const { data, error } = await supabase.rpc("admin_stats"); if (error) throw error; return data as Record<string, number>; },
  });
  const rows = useQuery({
    queryKey: ["admin-cards"], enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("cards")
        .select("id, card_code, status, created_at, profiles(slug, full_name, email)")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  if (!checked) return <Loading />;
  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <p className="text-muted-foreground">You don't have access to this page.</p>
      <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
    </div>
  );

  async function change(id: string, s: CardStatus) {
    await setCardStatus(id, s);
    qc.invalidateQueries({ queryKey: ["admin-cards"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  const s = stats.data;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo to="/admin" /><Button asChild size="sm" variant="ghost"><Link to="/dashboard">Dashboard</Link></Button>
      </div></header>
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <PageTitle title="Admin" subtitle="Users, cards and platform activity." />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <Stat label="Users" value={s?.total_users ?? "–"} />
          <Stat label="Cards" value={s?.total_cards ?? "–"} />
          <Stat label="Active" value={s?.active_cards ?? "–"} />
          <Stat label="Pending" value={s?.pending_cards ?? "–"} />
          <Stat label="Disabled" value={s?.disabled_cards ?? "–"} />
          <Stat label="Views" value={s?.total_views ?? "–"} />
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr>
              <th className="p-3">Card</th><th className="p-3">Owner</th><th className="p-3">Status</th><th className="p-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.data?.map((r) => {
                const p = r.profiles as unknown as { slug: string; full_name: string | null; email: string | null } | null;
                return (
                  <tr key={r.id}>
                    <td className="p-3 font-mono text-foreground">{r.card_code}</td>
                    <td className="p-3 text-foreground">{p?.full_name || p?.email || "—"} <span className="text-muted-foreground">/p/{p?.slug}</span></td>
                    <td className="p-3"><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></td>
                    <td className="space-x-2 p-3">
                      {r.status !== "active" && <Button size="sm" variant="outline" onClick={() => change(r.id, "active")}>Activate</Button>}
                      {r.status !== "disabled" && <Button size="sm" variant="ghost" onClick={() => change(r.id, "disabled")}>Disable</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
