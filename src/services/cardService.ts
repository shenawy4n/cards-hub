import { supabase } from "@/integrations/supabase/client";
import { cardRedirectUrl } from "@/lib/site";
import type { Card, CardResolution, CardStatus } from "@/types";

export async function getMyCards(userId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("id, user_id, profile_id, card_code, encoded_url, status, created_at, activated_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function setCardStatus(cardId: string, status: CardStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "active") patch.activated_at = new Date().toISOString();
  const { error } = await supabase.from("cards").update(patch).eq("id", cardId);
  if (error) throw error;
}

/** Keeps the stored encoded URL in sync with the canonical QR target. */
export async function syncEncodedUrl(card: Card): Promise<void> {
  const url = cardRedirectUrl(card.card_code, "qr");
  if (card.encoded_url === url) return;
  await supabase.from("cards").update({ encoded_url: url }).eq("id", card.id);
}

/** Public lookup used by the /r/:cardId redirect. Never exposes internal ids. */
export async function resolveCard(cardCode: string): Promise<CardResolution> {
  const { data, error } = await supabase.rpc("resolve_card", { p_card_code: cardCode });
  if (error) throw error;
  return (data as CardResolution) ?? { found: false };
}
