import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("group inline-flex items-baseline gap-2", className)}>
      <span className="font-display text-lg font-bold tracking-tight">4N</span>
      <span className="font-display text-lg font-medium text-metal">HUB</span>
    </Link>
  );
}

export function BrandFootnote({ className }: { className?: string }) {
  return (
    <p className={cn("brand-track text-[10px] text-muted-foreground", className)}>
      4N HUB by 4N SYSTEMS
    </p>
  );
}
