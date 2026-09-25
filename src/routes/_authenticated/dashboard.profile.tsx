import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading, PageTitle } from "@/components/dashboard/Stat";
import { useMyLinks, useMyProfile } from "@/hooks/useMyData";
import { addLink, deleteLink, isSlugAvailable, updateLink, updateProfile } from "@/services/profileService";
import { slugify } from "@/lib/site";
import { LINK_PLATFORMS, type Profile } from "@/types";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfileEditor,
});

const FIELDS: { key: keyof Profile; label: string; type?: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "job_title", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "avatar_url", label: "Photo URL", type: "url" },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "whatsapp", label: "WhatsApp number", type: "tel" },
  { key: "email", label: "Public email", type: "email" },
  { key: "website", label: "Website", type: "url" },
  { key: "location", label: "Location" },
];

function ProfileEditor() {
  const qc = useQueryClient();
  const profile = useMyProfile();
  const links = useMyLinks(profile.data?.id);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [newLink, setNewLink] = useState({ platform: "linkedin", url: "" });

  useEffect(() => { if (profile.data) setForm(profile.data); }, [profile.data]);
  if (profile.isLoading || !profile.data) return <Loading />;
  const p = profile.data;

  async function save() {
    setSaving(true);
    try {
      const slug = slugify(form.slug ?? "");
      if (slug.length < 3) throw new Error("Username must be at least 3 characters.");
      if (!(await isSlugAvailable(slug, p.id))) throw new Error("That username is taken.");
      const patch: Partial<Profile> = { slug, is_public: !!form.is_public, bio: form.bio?.trim() || null };
      for (const f of FIELDS) (patch as Record<string, unknown>)[f.key] = (form[f.key] as string)?.trim() || null;
      await updateProfile(p.id, patch);
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Profile saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function add() {
    if (!/^https?:\/\//.test(newLink.url)) return toast.error("Link must start with http:// or https://");
    await addLink(p.id, { ...newLink, sort_order: links.data?.length ?? 0 });
    setNewLink({ ...newLink, url: "" });
    qc.invalidateQueries({ queryKey: ["my-links"] });
  }

  return (
    <div className="space-y-8">
      <PageTitle title="Profile" subtitle="What people see when they tap or scan your card." />
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Username (profile link)</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/p/</span>
            <Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
        </div>
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label}</Label>
            <Input type={f.type ?? "text"} value={(form[f.key] as string) ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2">
          <Label>Bio</Label>
          <Textarea rows={3} maxLength={300} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch checked={!!form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
          <span className="text-sm text-foreground">Profile is public</span>
        </div>
        <div className="sm:col-span-2"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button></div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Links</h2>
        {links.data?.map((l) => (
          <div key={l.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="w-20 text-xs uppercase text-muted-foreground">{l.platform}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{l.url}</span>
            <Switch checked={l.is_visible} onCheckedChange={async (v) => { await updateLink(l.id, { is_visible: v }); qc.invalidateQueries({ queryKey: ["my-links"] }); }} />
            <Button size="icon" variant="ghost" onClick={async () => { await deleteLink(l.id); qc.invalidateQueries({ queryKey: ["my-links"] }); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={newLink.platform} onValueChange={(v) => setNewLink({ ...newLink, platform: v })}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{LINK_PLATFORMS.map((pl) => <SelectItem key={pl} value={pl}>{pl}</SelectItem>)}</SelectContent>
          </Select>
          <Input placeholder="https://…" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} />
          <Button variant="outline" onClick={add}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>
      </section>
    </div>
  );
}
