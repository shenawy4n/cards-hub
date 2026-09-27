import { supabase } from "@/integrations/supabase/client";
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

/** Owner toggle for an already-activated card (pending cards need an admin). */
export async function setMyCardStatus(cardId: string, status: Exclude<CardStatus, "pending">): Promise<void> {
  const { error } = await supabase.rpc("user_set_card_status" as never, { p_card_id: cardId, p_status: status } as never);
  if (error) throw error;
}

/** Audited admin status change. */
export async function adminSetCardStatus(cardIds: string[], status: Exclude<CardStatus, "pending">): Promise<number> {
  const { data, error } = await supabase.rpc("admin_set_card_status", { p_card_ids: cardIds, p_status: status });
  if (error) throw error;
  return (data as number) ?? 0;
}

/** Public lookup used by the /r/:cardId redirect. Never exposes internal ids. */
export async function resolveCard(cardCode: string): Promise<CardResolution> {
  const { data, error } = await supabase.rpc("resolve_card", { p_card_code: cardCode });
  if (error) throw error;
  return (data as unknown as CardResolution) ?? { found: false };
}
