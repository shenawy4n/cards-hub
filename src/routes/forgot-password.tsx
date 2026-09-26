import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — 4N HUB" },
      { name: "description", content: "Reset your 4N HUB account password." },
      { property: "og:title", content: "Reset password — 4N HUB" },
      { property: "og:description", content: "Reset your 4N HUB account password." },
    ],
  }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }
  return (
    <AuthShell title="Reset password" subtitle={sent ? "If that email exists, a reset link is on its way." : "We'll email you a reset link."}>
      {!sent && (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
      )}
      <p className="mt-5 text-center text-sm"><Link to="/login" className="text-muted-foreground hover:text-foreground">Back to log in</Link></p>
    </AuthShell>
  );
}
