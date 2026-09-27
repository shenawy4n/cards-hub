/**
 * Canonical public origin used for QR / NFC / profile / share URLs.
 * Set VITE_PUBLIC_APP_URL (e.g. https://4nhub.com) in production.
 * Without it, production builds fall back to the canonical domain and
 * development/preview uses the current origin so links remain testable.
 */
const CANONICAL_FALLBACK = "https://4nhub.com";

export function getPublicOrigin(): string {
  const configured = (import.meta.env["VITE_PUBLIC_APP_URL"] as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (import.meta.env.DEV && typeof window !== "undefined") return window.location.origin;
  return CANONICAL_FALLBACK;
}

/** True when generated links point somewhere other than the canonical production domain. */
export function isNonCanonicalOrigin(): boolean {
  return getPublicOrigin() !== CANONICAL_FALLBACK && !import.meta.env["VITE_PUBLIC_APP_URL"];
}

/** @deprecated use getPublicOrigin */
export const getOrigin = getPublicOrigin;

export function cardRedirectUrl(cardCode: string, source: "qr" | "nfc"): string {
  return `${getPublicOrigin()}/r/${cardCode}?src=${source}`;
}

export function profileUrl(slug: string): string {
  return `${getPublicOrigin()}/p/${slug}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
