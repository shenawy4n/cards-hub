import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — 4N HUB" },
      { name: "description", content: "Create your 4N HUB account and get your digital identity card." },
      { property: "og:title", content: "Create your account — 4N HUB" },
      { property: "og:description", content: "One premium card. Your complete digital identity." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) window.location.assign("/dashboard");
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`We sent a confirmation link to ${email}.`}>
        <Button asChild variant="outline" className="w-full"><Link to="/login">Back to log in</Link></Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Get your card" subtitle="Create your 4N HUB account.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/login" className="text-foreground hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
