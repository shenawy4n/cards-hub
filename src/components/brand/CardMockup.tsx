import { cn } from "@/lib/utils";

interface CardMockupProps {
  cardCode?: string | undefined;
  qrSrc?: string | undefined;
  className?: string;
}

/** Lightweight visual mockup of the physical card (85.6 x 54 mm proportion). */
export function CardMockup({ cardCode, qrSrc, className }: CardMockupProps) {
  return (
    <div
      className={cn(
        "relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background p-6",
        "shadow-[0_24px_60px_-24px_oklch(0_0_0/80%)]",
        className,
      )}
      style={{ aspectRatio: "85.6 / 54" }}
    >
      <div className="absolute inset-0 hairline-grid opacity-60" />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ backgroundImage: "var(--gradient-metal)" }}
      />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <p className="font-display text-xl font-bold leading-none">4N</p>
          <p className="brand-track mt-2 text-[9px] text-silver">4N Systems</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="brand-track text-[9px] text-muted-foreground">Tap or scan</p>
            <p className="mt-1 font-mono text-[11px] text-silver">{cardCode ?? "4NH-000000"}</p>
          </div>
          <div className="flex size-16 items-center justify-center rounded-md bg-primary p-1">
            {qrSrc ? (
              <img src={qrSrc} alt="Card QR code" className="size-full rounded-sm" />
            ) : (
              <div className="size-full rounded-sm bg-primary-foreground/10" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
