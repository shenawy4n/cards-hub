import { supabase } from "@/integrations/supabase/client";
import type { CardEvent, EventSource, EventType } from "@/types";

export async function logEvent(input: {
  eventType: EventType;
  source?: EventSource;
  slug?: string;
  cardCode?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("log_event", {
    p_event_type: input.eventType,
    p_source: input.source ?? "unknown",
    p_slug: input.slug ?? undefined,
    p_card_code: input.cardCode ?? undefined,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });
  if (error) console.error("log_event failed", error.message);
}

export async function getProfileEvents(profileId: string): Promise<CardEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, card_id, profile_id, event_type, source, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as CardEvent[];
}

export interface AnalyticsSummary {
  totalViews: number;
  qr: number;
  nfc: number;
  direct: number;
  last7: number;
  last30: number;
  recent: CardEvent[];
  daily: { date: string; views: number }[];
}

export function summarize(events: CardEvent[]): AnalyticsSummary {
  const now = Date.now();
  const day = 86_400_000;
  const views = events.filter((e) => e.event_type === "profile_view");
  const at = (e: CardEvent) => new Date(e.created_at).getTime();

  const daily: { date: string; views: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date(now - i * day);
    const key = start.toISOString().slice(0, 10);
    daily.push({
      date: key,
      views: views.filter((e) => new Date(e.created_at).toISOString().slice(0, 10) === key).length,
    });
  }

  return {
    totalViews: views.length,
    qr: events.filter((e) => e.source === "qr").length,
    nfc: events.filter((e) => e.source === "nfc").length,
    direct: events.filter((e) => e.source === "direct").length,
    last7: views.filter((e) => now - at(e) <= 7 * day).length,
    last30: views.filter((e) => now - at(e) <= 30 * day).length,
    recent: events.slice(0, 15),
    daily,
  };
}
