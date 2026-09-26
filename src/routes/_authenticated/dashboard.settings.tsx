import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/dashboard/Stat";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useMyData";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: Settings,
});

function Settings() {
  const user = useUser();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as never);
    if (error) { toast.error(error.message); return; }
    setCurrent(""); setPw("");
    toast.success("Password updated");
  }

  return (
    <div className="max-w-md space-y-6">
      <PageTitle title="Settings" subtitle={`Signed in as ${user.email}`} />
      <form onSubmit={change} className="space-y-4 rounded-xl border border-border p-5">
        <h2 className="font-display font-semibold text-foreground">Change password</h2>
        <div className="space-y-2"><Label>Current password</Label><Input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
        <div className="space-y-2"><Label>New password</Label><Input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit">Update password</Button>
      </form>
    </div>
  );
}
