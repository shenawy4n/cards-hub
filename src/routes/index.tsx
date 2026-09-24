import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Nfc, QrCode, RefreshCw, ScanLine, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CardMockup } from "@/components/brand/CardMockup";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "4N HUB — Your identity. One tap away." },
      {
        name: "description",
        content:
          "One premium NFC + QR card linked to a digital profile you can update anytime. 4N HUB by 4N SYSTEMS.",
      },
      { property: "og:title", content: "4N HUB — Your identity. One tap away." },
      {
        property: "og:description",
        content: "One premium card. Your complete digital identity.",
      },
    ],
  }),
  component: Landing,
});

function SectionLabel({ children }: { children: string }) {
  return <p className="brand-track text-[10px] text-silver">{children}</p>;
}

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 hairline-grid opacity-70" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-5 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <SectionLabel>4N Hub</SectionLabel>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] md:text-6xl">
              Your identity.
              <br />
              <span className="text-metal">One tap away.</span>
            </h1>
            <p className="mt-6 max-w-md text-base text-muted-foreground">
              One premium card. Your complete digital identity. Matte black, NFC inside, QR on the
              back — and a profile you can change anytime.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/signup">
                  Get Your 4N Card <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <CardMockup />
          </div>
        </div>
      </section>

      {/* QR + NFC */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionLabel>QR + NFC</SectionLabel>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold">
            Two ways in. One living identity.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Nfc,
                title: "Tap",
                body: "An NFC chip inside the card opens your profile on any modern phone — no app required.",
              },
              {
                icon: QrCode,
                title: "Scan",
                body: "A high-contrast QR code points at the same dynamic link, for phones and screens alike.",
              },
              {
                icon: RefreshCw,
                title: "Update",
                body: "Your card points to a dynamic URL, so changing your details never means reprinting.",
              },
            ].map((item) => (
              <article key={item.title} className="surface-panel p-6">
                <item.icon className="size-5 text-silver" />
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Digital profile */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:items-center">
          <div>
            <SectionLabel>Digital profile</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold">Everything about you, nothing on the card.</h2>
            <p className="mt-5 text-sm text-muted-foreground">
              Your photo, role, company, bio, phone, email, WhatsApp, website, location and social
              links live in one clean mobile-first page. Visitors can save you as a contact in one
              tap.
            </p>
            <ul className="mt-7 space-y-3 text-sm text-muted-foreground">
              {["Clean mobile-first layout", "One-tap Save Contact (vCard)", "Public or private at any time"].map(
                (line) => (
                  <li key={line} className="flex items-center gap-3">
                    <span className="size-1.5 rounded-full bg-silver" />
                    {line}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div className="surface-panel p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-full bg-accent">
                <UserRound className="size-6 text-silver" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold">Your Name</p>
                <p className="text-sm text-muted-foreground">Role · Company</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["Call", "Email", "WhatsApp", "Website"].map((action) => (
                <div
                  key={action}
                  className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm"
                >
                  {action}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-4 text-3xl font-semibold">Four steps.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { step: "01", title: "Create your account", body: "Sign up and your profile is created instantly." },
              { step: "02", title: "Fill your profile", body: "Add your details and links. Save. Done." },
              { step: "03", title: "Activate your card", body: "Your unique card code and QR are generated for you." },
              { step: "04", title: "Tap or scan", body: "Every tap and scan reaches your live profile." },
            ].map((item) => (
              <li key={item.step} className="surface-panel p-6">
                <p className="font-mono text-xs text-silver">{item.step}</p>
                <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Analytics */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:items-center">
          <div className="surface-panel grid grid-cols-2 gap-px overflow-hidden">
            {[
              { label: "Profile views", icon: BarChart3 },
              { label: "QR visits", icon: QrCode },
              { label: "NFC visits", icon: Nfc },
              { label: "Direct visits", icon: ScanLine },
            ].map((item) => (
              <div key={item.label} className="bg-background/40 p-6">
                <item.icon className="size-4 text-silver" />
                <p className="mt-4 text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <div>
            <SectionLabel>Analytics</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold">Know what your card actually does.</h2>
            <p className="mt-5 text-sm text-muted-foreground">
              Every tap and scan is attributed to its source, so you can see whether people reached
              you through NFC, QR, or a direct link — over the last 7 or 30 days.
            </p>
          </div>
        </div>
      </section>

      {/* Card preview */}
      <section className="border-b border-border/70 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-2 md:items-center">
          <div>
            <SectionLabel>The card</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold">Matte black. Nothing to explain.</h2>
            <p className="mt-5 text-sm text-muted-foreground">
              Silver hairline details, white typography, and almost no printed information. The card
              is the key; your profile is the product.
            </p>
          </div>
          <div className="flex justify-center md:justify-end">
            <CardMockup />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">Your identity. One tap away.</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Create your 4N HUB profile in under a minute.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/signup">
              Get Your 4N Card <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
