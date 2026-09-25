import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardMockup } from "@/components/brand/CardMockup";
import { Loading, PageTitle, Stat } from "@/components/dashboard/Stat";
import { useMyAnalytics, useMyCards, useMyProfile } from "@/hooks/useMyData";
import { profileUrl } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

function Overview() {
  const profile = useMyProfile();
  const cards = useMyCards(!!profile.data);
  const stats = useMyAnalytics(profile.data?.id);
  if (profile.isLoading) return <Loading />;
  if (profile.error || !profile.data) return <p className="text-destructive">Could not load your profile.</p>;
  const p = profile.data;
  const card = cards.data?.[0];

  return (
    <div>
      <PageTitle title={`Hello${p.full_name ? `, ${p.full_name.split(" ")[0]}` : ""}`} subtitle="Your identity at a glance." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <CardMockup cardCode={card?.card_code} />
          <div className="flex flex-wrap items-center gap-2">
            {card && <Badge variant={card.status === "active" ? "default" : "secondary"}>{card.status}</Badge>}
            <Button asChild size="sm" variant="outline">
              <a href={profileUrl(p.slug)} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />View public profile</a>
            </Button>
          </div>
          {!p.full_name && (
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              Your profile is empty. <Link to="/dashboard/profile" className="text-foreground underline">Complete it now</Link>.
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 content-start gap-3">
          <Stat label="Total views" value={stats.data?.totalViews ?? 0} />
          <Stat label="Last 7 days" value={stats.data?.last7 ?? 0} />
          <Stat label="QR scans" value={stats.data?.qr ?? 0} />
          <Stat label="NFC taps" value={stats.data?.nfc ?? 0} />
        </div>
      </div>
    </div>
  );
}
