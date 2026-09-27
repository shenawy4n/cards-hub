import { useState, type ReactNode } from "react";
import { format } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Inbox, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/** Typed-loose wrapper around admin RPCs (all enforce admin server-side). */
export async function adminRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name as never, (args ?? {}) as never);
  if (error) throw error;
  return data as T;
}

export type Paged<T> = { total: number; rows: T[] };
export const PAGE_SIZE = 25;

export const fmtDate = (v?: string | null) => (v ? format(new Date(v), "d MMM yyyy") : "—");
export const fmtDateTime = (v?: string | null) => (v ? format(new Date(v), "d MMM yyyy, HH:mm") : "—");

export const adminHead = (title: string) => () => ({
  meta: [
    { title: `${title} — 4N HUB Admin` },
    { name: "description", content: `4N HUB admin: ${title.toLowerCase()}.` },
    { property: "og:title", content: `${title} — 4N HUB Admin` },
    { property: "og:description", content: `4N HUB admin: ${title.toLowerCase()}.` },
    { name: "robots", content: "noindex" },
  ],
});

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminKpiCard({ label, value, cur, prev, hint }: { label: string; value?: number | string | undefined; cur?: number | undefined; prev?: number | undefined; hint?: string | undefined }) {
  let delta: ReactNode = null;
  if (cur !== undefined && prev !== undefined) {
    const d = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    delta = <span className={cn("text-xs", d > 0 ? "text-success" : d < 0 ? "text-destructive" : "text-muted-foreground")}>{d > 0 ? "+" : ""}{d}% vs prev.</span>;
  }
  return (
    <div className="surface-panel rounded-xl border border-border p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-foreground">{value ?? "–"}</div>
      <div className="mt-1 min-h-4">{delta ?? (hint && <span className="text-xs text-muted-foreground">{hint}</span>)}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls = status === "active" ? "border-success/40 text-success" : status === "disabled" ? "border-destructive/40 text-destructive" : "border-warning/40 text-warning";
  return <Badge variant="outline" className={cn("capitalize", cls)}>{status}</Badge>;
}

export function EmptyState({ title = "Nothing here yet", text }: { title?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {text && <p className="text-xs text-muted-foreground">{text}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: (() => void) | undefined }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 py-10 text-center">
      <AlertTriangle className="h-6 w-6 text-destructive" />
      <p className="text-sm text-foreground">Couldn't load this data.</p>
      {error instanceof Error && <p className="max-w-md text-xs text-muted-foreground">{error.message}</p>}
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RotateCw className="mr-1 h-4 w-4" />Retry</Button>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />)}
    </div>
  );
}

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string; mobileHidden?: boolean }

/** Table on desktop, stacked cards on mobile. Handles loading/error/empty. */
export function AdminDataTable<T>({ columns, rows, rowKey, onRowClick, loading, error, onRetry, empty }: {
  columns: Column<T>[]; rows?: T[] | undefined; rowKey: (r: T) => string; onRowClick?: ((r: T) => unknown) | undefined;
  loading?: boolean; error?: unknown; onRetry?: (() => unknown) | undefined; empty?: string | undefined;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (!rows?.length) return <EmptyState title={empty ?? "No results"} text="Try changing the filters." />;
  const click = onRowClick ? "cursor-pointer hover:bg-accent/40" : "";
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{columns.map((c) => <th key={c.header} className={cn("p-3 font-medium", c.className)}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={rowKey(r)} className={click} onClick={() => onRowClick?.(r)}>
                {columns.map((c) => <td key={c.header} className={cn("p-3 text-foreground", c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <div key={rowKey(r)} className={cn("rounded-xl border border-border p-3", click)} onClick={() => onRowClick?.(r)}>
            {columns.filter((c) => !c.mobileHidden).map((c) => (
              <div key={c.header} className="flex items-center justify-between gap-3 py-1 text-sm">
                <span className="text-xs text-muted-foreground">{c.header}</span>
                <span className="min-w-0 truncate text-right text-foreground">{c.cell(r)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export function Pager({ page, total, onPage, size = PAGE_SIZE }: { page: number; total: number; onPage: (p: number) => void; size?: number }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <span>{page + 1} / {pages}</span>
        <Button size="icon" variant="outline" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function AdminFilters({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

export function ConfirmActionDialog({ open, onOpenChange, title, description, confirmLabel, destructive, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={busy} className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={async (e) => { e.preventDefault(); setBusy(true); try { await onConfirm(); onOpenChange(false); } finally { setBusy(false); } }}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** CSV export of the current filtered dataset (fetches up to 5000 rows server-side). */
export function ExportCsvButton<T extends Record<string, unknown>>({ fetchAll, filename, fields }: {
  fetchAll: () => Promise<T[]>; filename: string; fields: (keyof T & string)[];
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const rows = await fetchAll();
      const esc = (v: unknown) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
      const csv = [fields.join(","), ...rows.map((r) => fields.map((f) => esc(r[f])).join(","))].join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a"); a.href = url; a.download = `${filename}-${format(new Date(), "yyyyMMdd")}.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(false); }
  }
  return <Button size="sm" variant="outline" onClick={run} disabled={busy}><Download className="mr-1 h-4 w-4" />{busy ? "Exporting…" : "Export CSV"}</Button>;
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display font-semibold text-foreground">{title}</h2>{action}
      </div>
      {children}
    </section>
  );
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="truncate text-foreground">{v ?? "—"}</dd></div>
      ))}
    </dl>
  );
}

export const EVENT_LABELS: Record<string, string> = {
  profile_view: "Profile viewed", card_redirect: "Card scanned/tapped", profile_created: "New profile / card",
  profile_updated: "Profile updated", card_activated: "Card activated", card_disabled: "Card disabled",
  admin_card_activated: "Card activated (admin)", admin_action: "Admin action",
};
