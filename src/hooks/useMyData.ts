import { useQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { ensureProfile, getLinks } from "@/services/profileService";
import { getMyCards, syncEncodedUrl } from "@/services/cardService";
import { getProfileEvents, summarize } from "@/services/analyticsService";

export function useUser() {
  return useRouteContext({ from: "/_authenticated" }).user;
}

export function useMyProfile() {
  const user = useUser();
  return useQuery({
    queryKey: ["my-profile", user.id],
    queryFn: () => ensureProfile(user.id, user.email ?? null),
  });
}

export function useMyLinks(profileId?: string) {
  return useQuery({
    queryKey: ["my-links", profileId],
    queryFn: () => getLinks(profileId!),
    enabled: !!profileId,
  });
}

export function useMyCards(enabled: boolean) {
  const user = useUser();
  return useQuery({
    queryKey: ["my-cards", user.id],
    enabled,
    queryFn: async () => {
      const cards = await getMyCards(user.id);
      await Promise.all(cards.map(syncEncodedUrl));
      return cards;
    },
  });
}

export function useMyAnalytics(profileId?: string) {
  return useQuery({
    queryKey: ["my-events", profileId],
    enabled: !!profileId,
    queryFn: async () => summarize(await getProfileEvents(profileId!)),
  });
}
