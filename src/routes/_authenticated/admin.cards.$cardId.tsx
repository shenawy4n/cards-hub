import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminKpiCard, AdminPageHeader, ConfirmActionDialog, EmptyState, ErrorState, EVENT_LABELS, KV, LoadingState, Section, StatusBadge, adminHead, adminRpc, fmtDate, fmtDateTime } from "@/components/admin/ui";
import { adminSetCardStatus } from "@/services/cardService";
import { cardRedirectUrl, profileUrl } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/cards/$cardId")({
  head: adminHead("Card details"),
  component: CardDetails,
});

export type Stats = { views: number; qr: number; nfc: number; direct: number; last7: number; last30: number; last_activity: string | null };
export type Ev = { id: string; event_type: string; source: string; created_at: string };
type Detail = {
  card: { id: string; card_code: string; status: string; created_at: string; activated_at: string | null; user_id: string };
  profile: { id: string; slug: string; full_name: string | null; email: string | null; is_public: boolean };
  card_stats: Stats; profile_stats: Stats; events: Ev[];
};

export function EventsList({ events }: { events: Ev[] }) {
  if (!events.length) return <EmptyState title="No events yet" />;
  return (
    <ul className="divide-y divide-border text-sm">{events.map((e) => (
      <li key={e.id} className="flex justify-between gap-3 py-2"><span>{EVENT_LABELS[e.event_type] ?? e.event_type} <span className="text-xs uppercase text-muted-foreground">{e.source}</span></span><span className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</span></li>
    ))}</ul>
  );
}

function CardDetails() {
  const { cardId } = Route.useParams();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<"active" | "disabled" | null>(null);
  const d = useQuery({ queryKey: ["admin-card", cardId], queryFn: () => adminRpc<Detail | null>("admin_card_details", { p_card_id: cardId }) });

  if (d.isLoading) return <LoadingState />;
  if (d.error) return <ErrorState error={d.error} onRetry={() => d.refetch()} />;
  if (!d.data) return <EmptyState title="Card not found" />;
  const { card, profile, card_stats: s, events } = d.data;

  async function apply(status: "active" | "disabled") {
    try {
      await adminSetCardStatus([card.id], status);
      toast.success(status === "active" ? "Card activated" : "Card disabled");
      qc.invalidateQueries({ queryKey: ["admin-card", cardId] });
      qc.invalidateQueries({ queryKey: ["admin-cards"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-6">
      <Button asChild size="sm" variant="ghost"><Link to="/admin/cards"><ArrowLeft className="mr-1 h-4 w-4" />Cards</Link></Button>
      <AdminPageHeader title={card.card_code} subtitle="Card details"
        actions={<>
          {card.status !== "active" && <Button size="sm" onClick={() => setConfirm("active")}>Activate</Button>}
          {card.status !== "disabled" && <Button size="sm" variant="outline" onClick={() => setConfirm("disabled")}>Disable</Button>}
        </>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Card">
          <KV items={[["Code", <span className="font-mono">{card.card_code}</span>], ["Status", <StatusBadge status={card.status} />], ["Created", fmtDateTime(card.created_at)], ["Activated", fmtDateTime(card.activated_at)],
            ["QR URL", <span className="font-mono text-xs">{cardRedirectUrl(card.card_code, "qr")}</span>], ["NFC URL", <span className="font-mono text-xs">{cardRedirectUrl(card.card_code, "nfc")}</span>]]} />
        </Section>
        <Section title="Owner" action={<Button asChild size="sm" variant="ghost"><Link to="/admin/users/$userId" params={{ userId: card.user_id }}>Open user</Link></Button>}>
          <KV items={[["Name", profile.full_name], ["Email", profile.email], ["Profile", <a className="underline" href={profileUrl(profile.slug)} target="_blank" rel="noreferrer">/p/{profile.slug}</a>], ["Visibility", profile.is_public ? "Public" : "Private"]]} />
        </Section>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminKpiCard label="Profile views" value={d.data.profile_stats.views} /><AdminKpiCard label="QR" value={s.qr} /><AdminKpiCard label="NFC" value={s.nfc} />
        <AdminKpiCard label="Last activity" value={fmtDate(s.last_activity)} />
      </div>
      <Section title="Recent events"><EventsList events={events} /></Section>
      <ConfirmActionDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)} destructive={confirm === "disabled"}
        title={confirm === "active" ? "Activate this card?" : "Disable this card?"}
        description={confirm === "active" ? "Scans and taps will open the owner's public profile." : "Scans and taps will stop opening the profile until re-activated."}
        confirmLabel={confirm === "active" ? "Activate" : "Disable"} onConfirm={() => apply(confirm!)} />
    </div>
  );
}
