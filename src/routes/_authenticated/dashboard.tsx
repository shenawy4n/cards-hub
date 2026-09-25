import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, User, CreditCard, BarChart3, Settings, Shield, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useSession";
import { useUser } from "@/hooks/useMyData";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — 4N HUB" },
      { name: "description", content: "Manage your 4N HUB profile, card and analytics." },
      { property: "og:title", content: "Dashboard — 4N HUB" },
      { property: "og:description", content: "Manage your 4N HUB profile, card and analytics." },
    ],
  }),
  component: DashboardLayout,
});

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/dashboard/profile", label: "Profile", icon: User },
  { to: "/dashboard/card", label: "My card", icon: CreditCard },
  { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function DashboardLayout() {
  const user = useUser();
  const { isAdmin } = useIsAdmin(user.id);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const linkCls = "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  const activeCls = "bg-accent text-foreground";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo to="/dashboard" />
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Sign out</Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 md:flex-row">
        <nav className="flex gap-1 overflow-x-auto md:w-52 md:shrink-0 md:flex-col">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className={linkCls} activeProps={{ className: activeCls }}>
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className={linkCls}><Shield className="h-4 w-4" />Admin</Link>
          )}
        </nav>
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
    </div>
  );
}
