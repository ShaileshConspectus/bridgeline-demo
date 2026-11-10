import { cn } from "@/lib/utils";

// The navy bar + white uppercase label used throughout the Conspectus
// Advisors two-pager for section headers ("WHY NOW", "HOW WE WORK — THE
// OPERATING BRIDGE", "IN PRACTICE"). Use in place of a plain
// text-muted uppercase heading wherever a page break deserves the same
// visual weight the letterhead gives it.
export function SectionBand({
  children,
  subtitle,
  className,
}: {
  children: React.ReactNode;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md bg-primary px-4 py-2.5 text-primary-foreground", className)}>
      <p className="text-sm font-semibold uppercase tracking-wide">{children}</p>
      {subtitle && <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>}
    </div>
  );
}
