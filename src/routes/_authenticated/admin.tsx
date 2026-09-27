import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, CreditCard, FileText, LayoutGrid, Menu, Search, Settings, Shield, UserCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Logo } from "@/components/brand/Logo";
import { Loading } from "@/components/dashboard/Stat";
import { useIsAdmin } from "@/hooks/useSession";
import { useUser } from "@/hooks/useMyData";
import { adminHead, adminRpc } from "@/components/admin/ui";

export const Route = createFileRoute("/_authenticated/admin")({
  head: adminHead("Control Center"),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/cards", label: "Cards", icon: CreditCard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/profiles", label: "Profiles", icon: UserCircle },
  { to: "/admin/activity", label: "Activity", icon: Activity },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: FileText },
  { to: "/admin/admins", label: "Admin Users", icon: Shield },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const cls = "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link key={n.to} to={n.to} onClick={onNavigate} activeOptions={{ exact: "exact" in n }} className={cls} activeProps={{ className: "bg-accent text-foreground" }}>
          <n.icon className="h-4 w-4" />{n.label}
        </Link>
      ))}
    </nav>
  );
}

function AdminLayout() {
  const user = useUser();
  const { isAdmin, checked } = useIsAdmin(user.id);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((s) => !s); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  if (!checked) return <Loading />;
  if (!isAdmin) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <p className="text-muted-foreground">You don't have access to this page.</p>
      <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMenu(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></Button>
            <Logo to="/admin" />
            <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:inline">Control Center</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSearch(true)} className="text-muted-foreground">
              <Search className="mr-1 h-4 w-4" />Search<kbd className="ml-2 hidden rounded border border-border px-1 text-[10px] sm:inline">⌘K</kbd>
            </Button>
            <Button asChild size="sm" variant="ghost"><Link to="/dashboard">Dashboard</Link></Button>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r border-border p-3 md:block"><AdminSidebar /></aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8"><div className="mx-auto max-w-6xl"><Outlet /></div></main>
      </div>
      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left" className="w-64 p-4">
          <SheetTitle className="mb-4"><Logo to="/admin" /></SheetTitle>
          <AdminSidebar onNavigate={() => setMenu(false)} />
        </SheetContent>
      </Sheet>
      <AdminSearch open={search} onOpenChange={setSearch} />
    </div>
  );
}

type SearchRes = {
  profiles: { user_id: string; slug: string; full_name: string | null; email: string | null }[];
  cards: { id: string; card_code: string; status: string; full_name: string | null; email: string | null }[];
};

function AdminSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const navigate = useNavigate();
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const res = useQuery({
    queryKey: ["admin-search", dq], enabled: open && dq.length >= 2,
    queryFn: () => adminRpc<SearchRes>("admin_search", { p_q: dq }),
  });
  const go = (fn: () => void) => { onOpenChange(false); setQ(""); fn(); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput placeholder="Search cards, users, profiles…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{dq.length < 2 ? "Type at least 2 characters." : res.isFetching ? "Searching…" : "No results."}</CommandEmpty>
        {!!res.data?.cards.length && (
          <CommandGroup heading="Cards">
            {res.data.cards.map((c) => (
              <CommandItem key={c.id} value={`card-${c.id}`} onSelect={() => go(() => navigate({ to: "/admin/cards/$cardId", params: { cardId: c.id } }))}>
                <CreditCard className="mr-2 h-4 w-4" /><span className="font-mono">{c.card_code}</span>
                <span className="ml-2 truncate text-xs text-muted-foreground">{c.full_name || c.email} · {c.status}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!res.data?.profiles.length && (
          <CommandGroup heading="Users / Profiles">
            {res.data.profiles.map((p) => (
              <CommandItem key={p.user_id} value={`user-${p.user_id}`} onSelect={() => go(() => navigate({ to: "/admin/users/$userId", params: { userId: p.user_id } }))}>
                <UserCircle className="mr-2 h-4 w-4" />{p.full_name || p.email || p.slug}
                <span className="ml-2 truncate text-xs text-muted-foreground">/p/{p.slug} · {p.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
