import type { ReactNode } from "react";
import { Logo, BrandFootnote } from "@/components/brand/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12">
      <div className="mb-8"><Logo /></div>
      <div className="surface-panel w-full max-w-sm rounded-2xl border border-border p-7">
        <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      <BrandFootnote className="mt-8" />
    </div>
  );
}
