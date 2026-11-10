import Link from "next/link";
import { cn } from "@/lib/utils";

export function ProjectNav({
  projectId,
  projectName,
  active,
}: {
  projectId: number;
  projectName: string;
  active: "settings" | "thesis" | "dashboard" | "reports" | "metrics" | "evidence" | "learning";
}) {
  const tabs = [
    { key: "thesis" as const, label: "Thesis Studio", href: `/projects/${projectId}/thesis` },
    { key: "metrics" as const, label: "Metrics Library", href: `/projects/${projectId}/metrics` },
    { key: "evidence" as const, label: "Evidence Hub", href: `/projects/${projectId}/evidence` },
    { key: "dashboard" as const, label: "Dashboard", href: `/projects/${projectId}/dashboard` },
    { key: "reports" as const, label: "Reports", href: `/projects/${projectId}/reports` },
    { key: "learning" as const, label: "Learning Agenda", href: `/projects/${projectId}/learning` },
    { key: "settings" as const, label: "Settings", href: `/projects/${projectId}` },
  ];

  return (
    <header className="flex flex-col gap-0 overflow-hidden rounded-md border border-border">
      <div className="flex items-center gap-2 bg-muted-surface px-4 py-2 text-sm text-muted">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{projectName}</span>
      </div>
      <nav className="flex gap-1 bg-primary px-2 py-1.5">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active === t.key
                ? "bg-white/15 text-white shadow-[inset_0_-2px_0_0_var(--accent)]"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
