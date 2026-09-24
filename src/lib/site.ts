/** Canonical public origin used for QR / NFC URLs. */
export function getOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://4nhub.com";
}

export function cardRedirectUrl(cardCode: string, source: "qr" | "nfc"): string {
  return `${getOrigin()}/r/${cardCode}?src=${source}`;
}

export function profileUrl(slug: string): string {
  return `${getOrigin()}/p/${slug}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
