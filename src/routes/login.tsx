import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — 4N HUB" },
      { name: "description", content: "Log in to manage your 4N HUB card and digital profile." },
      { property: "og:title", content: "Log in — 4N HUB" },
      { property: "og:description", content: "Manage your 4N HUB card and profile." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your 4N HUB account.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-2">
          <div className="flex justify-between"><Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</Link></div>
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New here? <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
