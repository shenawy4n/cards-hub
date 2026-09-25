import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { resolveCard } from "@/services/cardService";
import { logEvent } from "@/services/analyticsService";

export const Route = createFileRoute("/r/$cardCode")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ src: s.src === "nfc" ? "nfc" : s.src === "qr" ? "qr" : "direct" }) as { src: "qr" | "nfc" | "direct" },
  head: () => ({
    meta: [
      { title: "Opening profile — 4N HUB" },
      { name: "description", content: "Opening a 4N HUB digital profile." },
      { property: "og:title", content: "4N HUB card" },
      { property: "og:description", content: "Opening a 4N HUB digital profile." },
    ],
  }),
  component: Redirect,
});

function Redirect() {
  const { cardCode } = Route.useParams();
  const { src } = Route.useSearch();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Opening profile…");

  useEffect(() => {
    resolveCard(cardCode).then((r) => {
      if (!r.found) return setMsg("This card doesn't exist.");
      if (r.status !== "active") return setMsg("This card isn't active yet.");
      if (!r.is_public || !r.slug) return setMsg("This profile is private.");
      logEvent({ eventType: "card_redirect", source: src, cardCode });
      navigate({ to: "/p/$slug", params: { slug: r.slug }, search: { src }, replace: true });
    }).catch(() => setMsg("Something went wrong."));
  }, [cardCode, src, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <Logo />
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
