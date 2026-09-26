import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/site";
import type { Profile, ProfileLink, PublicProfile } from "@/types";

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

/** Creates the profile record the first time a signed-in user reaches the app. */
export async function ensureProfile(userId: string, email: string | null): Promise<Profile> {
  const existing = await getMyProfile(userId);
  if (existing) return existing;

  const base = slugify(email?.split("@")[0] ?? "") || "member";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("profiles")
      .insert({ user_id: userId, slug, email })
      .select("*")
      .single();
    if (!error) return data as Profile;
    if (error.code !== "23505") throw error;
    const retry = await getMyProfile(userId);
    if (retry) return retry;
  }
  throw new Error("Could not create profile");
}

export async function updateProfile(profileId: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profileId)
    .select("*")
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function isSlugAvailable(slug: string, profileId: string): Promise<boolean> {
  const { data, error } = await supabase.from("profiles").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return !data || data.id === profileId;
}

export async function getLinks(profileId: string): Promise<ProfileLink[]> {
  const { data, error } = await supabase
    .from("profile_links")
    .select("*")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProfileLink[];
}

export async function addLink(
  profileId: string,
  link: { platform: string; label?: string | null; url: string; sort_order: number },
): Promise<ProfileLink> {
  const { data, error } = await supabase
    .from("profile_links")
    .insert({ profile_id: profileId, ...link })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProfileLink;
}

export async function updateLink(id: string, patch: Partial<ProfileLink>): Promise<void> {
  const { error } = await supabase.from("profile_links").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteLink(id: string): Promise<void> {
  const { error } = await supabase.from("profile_links").delete().eq("id", id);
  if (error) throw error;
}

/** Public, unauthenticated read — returns only fields safe to publish. */
export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc("get_public_profile", { p_slug: slug });
  if (error) throw error;
  return (data as unknown as PublicProfile | null) ?? null;
}
