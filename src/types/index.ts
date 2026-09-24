export type CardStatus = "active" | "disabled" | "pending";
export type EventSource = "qr" | "nfc" | "direct" | "unknown";
export type EventType = "profile_view" | "card_redirect";

export interface Profile {
  id: string;
  user_id: string;
  slug: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  location: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileLink {
  id: string;
  profile_id: string;
  platform: string;
  label: string | null;
  url: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  profile_id: string;
  card_code: string;
  encoded_url: string | null;
  status: CardStatus;
  created_at: string;
  activated_at: string | null;
  updated_at: string;
}

export interface CardEvent {
  id: string;
  card_id: string | null;
  profile_id: string | null;
  event_type: EventType;
  source: EventSource;
  created_at: string;
}

export interface PublicProfileLink {
  platform: string;
  label: string | null;
  url: string;
}

export interface PublicProfile {
  slug: string;
  full_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  company: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  website: string | null;
  location: string | null;
  links: PublicProfileLink[];
}

export interface CardResolution {
  found: boolean;
  status?: CardStatus;
  slug?: string;
  is_public?: boolean;
}

export const LINK_PLATFORMS = [
  "linkedin",
  "instagram",
  "facebook",
  "x",
  "website",
  "other",
] as const;

export type LinkPlatform = (typeof LINK_PLATFORMS)[number];
