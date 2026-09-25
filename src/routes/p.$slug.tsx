import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Phone, Mail, MessageCircle, Globe, MapPin, Download, Linkedin, Instagram, Facebook, Twitter, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandFootnote } from "@/components/brand/Logo";
import { getPublicProfile } from "@/services/profileService";
import { logEvent } from "@/services/analyticsService";
import { downloadVCard } from "@/utils/vcard";

export const Route = createFileRoute("/p/$slug")({
  validateSearch: (s: Record<string, unknown>) => ({ src: s.src === "nfc" ? "nfc" : s.src === "qr" ? "qr" : undefined }) as { src?: "qr" | "nfc" },
  loader: async ({ params }) => {
    const profile = await getPublicProfile(params.slug);
    if (!profile) throw notFound();
    return { profile };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.profile;
    const name = p?.full_name || p?.slug || "Profile";
    const desc = [p?.job_title, p?.company].filter(Boolean).join(" · ") || "Digital profile on 4N HUB";
    const meta = [
      { title: `${name} — 4N HUB` },
      { name: "description", content: desc },
      { property: "og:title", content: `${name} — 4N HUB` },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
    ];
    if (p?.avatar_url?.startsWith("https://")) {
      meta.push({ property: "og:image", content: p.avatar_url }, { name: "twitter:image", content: p.avatar_url } as never);
    }
    return { meta };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-5 text-center">
      <h1 className="font-display text-2xl text-foreground">Profile not found</h1>
      <p className="text-sm text-muted-foreground">This profile doesn't exist or is private.</p>
      <Button asChild variant="outline"><Link to="/">Go to 4N HUB</Link></Button>
    </div>
  ),
  errorComponent: () => <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Could not load this profile.</div>,
  component: PublicProfilePage,
});

const ICONS: Record<string, typeof Globe> = { linkedin: Linkedin, instagram: Instagram, facebook: Facebook, x: Twitter, website: Globe };

function PublicProfilePage() {
  const { profile: p } = Route.useLoaderData();
  const { src } = Route.useSearch();

  useEffect(() => {
    logEvent({ eventType: "profile_view", source: src ?? "direct", slug: p.slug });
  }, [p.slug, src]);

  const initials = (p.full_name || p.slug).split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const actions = [
    p.phone && { href: `tel:${p.phone}`, label: "Call", icon: Phone },
    p.whatsapp && { href: `https://wa.me/${p.whatsapp.replace(/\D/g, "")}`, label: "WhatsApp", icon: MessageCircle },
    p.email && { href: `mailto:${p.email}`, label: "Email", icon: Mail },
    p.website && { href: p.website, label: "Website", icon: Globe },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];

  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          {p.avatar_url ? (
            <img src={p.avatar_url} alt={p.full_name ?? p.slug} className="h-28 w-28 rounded-full border border-border object-cover" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-border bg-card font-display text-3xl text-foreground">{initials}</div>
          )}
          <h1 className="mt-5 font-display text-3xl font-semibold text-foreground">{p.full_name || p.slug}</h1>
          {(p.job_title || p.company) && <p className="mt-1 text-muted-foreground">{[p.job_title, p.company].filter(Boolean).join(" · ")}</p>}
          {p.location && <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{p.location}</p>}
          {p.bio && <p className="mt-4 text-sm leading-relaxed text-foreground/80">{p.bio}</p>}
        </div>

        <Button className="mt-8 w-full" size="lg" onClick={() => downloadVCard(p)}><Download className="mr-2 h-4 w-4" />Save contact</Button>

        {actions.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {actions.map((a) => (
              <Button key={a.label} asChild variant="outline"><a href={a.href} target="_blank" rel="noreferrer"><a.icon className="mr-2 h-4 w-4" />{a.label}</a></Button>
            ))}
          </div>
        )}

        {p.links.length > 0 && (
          <div className="mt-6 space-y-2">
            {p.links.map((l, i) => {
              const Icon = ICONS[l.platform] ?? Link2;
              return (
                <a key={i} href={l.url} target="_blank" rel="noreferrer" className="surface-panel flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm text-foreground transition-colors hover:bg-accent">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 capitalize">{l.label || l.platform}</span>
                </a>
              );
            })}
          </div>
        )}
        <BrandFootnote className="mt-12 justify-center" />
      </div>
    </div>
  );
}
