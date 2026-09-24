import type { PublicProfile } from "@/types";

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildVCard(profile: PublicProfile): string {
  const name = profile.full_name?.trim() || profile.slug;
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escape(name)}`, `N:${escape(name)};;;;`];

  if (profile.job_title) lines.push(`TITLE:${escape(profile.job_title)}`);
  if (profile.company) lines.push(`ORG:${escape(profile.company)}`);
  if (profile.phone) lines.push(`TEL;TYPE=CELL:${escape(profile.phone)}`);
  if (profile.whatsapp) lines.push(`TEL;TYPE=WHATSAPP:${escape(profile.whatsapp)}`);
  if (profile.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(profile.email)}`);
  if (profile.website) lines.push(`URL:${escape(profile.website)}`);
  if (profile.location) lines.push(`ADR;TYPE=WORK:;;${escape(profile.location)};;;;`);
  if (profile.bio) lines.push(`NOTE:${escape(profile.bio)}`);
  for (const link of profile.links) lines.push(`URL:${escape(link.url)}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function downloadVCard(profile: PublicProfile) {
  const blob = new Blob([buildVCard(profile)], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${profile.slug}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}
