import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader, KV, Section, adminHead } from "@/components/admin/ui";
import { getPublicOrigin, isNonCanonicalOrigin } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: adminHead("Settings"),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Settings" subtitle="Platform configuration (read-only in this phase)." />
      <Section title="Public links">
        <KV items={[["Public origin for QR / NFC / profiles", <span className="font-mono">{getPublicOrigin()}</span>],
          ["Mode", isNonCanonicalOrigin() ? "Development — links use this preview address" : "Production"]]} />
      </Section>
      <Section title="Access">
        <p className="text-sm text-muted-foreground">Every admin page and action is verified on the server. Card status changes are recorded in the audit log.</p>
      </Section>
    </div>
  );
}
