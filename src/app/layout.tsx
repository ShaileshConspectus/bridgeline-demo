import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// Confirmed name (chosen from the options proposed alongside the
// Conspectus Advisors re-theme). Nothing else in the app hardcodes this
// string — change it here to rename again.
const APP_NAME = "Bridgeline";
const APP_TAGLINE = "MEL for climate capital";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Measurement, evaluation, and learning for climate projects.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="flex items-center justify-between gap-4 bg-primary px-6 py-4 text-primary-foreground">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="text-lg font-bold tracking-wide uppercase">{APP_NAME}</span>
            <span className="hidden text-xs italic text-white/60 sm:inline">{APP_TAGLINE}</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/organizations" className="text-xs uppercase tracking-wide text-white/70 hover:text-white">
              Organizations
            </Link>
            <Link href="/funders" className="text-xs uppercase tracking-wide text-white/70 hover:text-white">
              Funder view
            </Link>
            <span className="hidden text-xs uppercase tracking-wide text-white/50 sm:inline">
              Powered by Conspectus Advisors
            </span>
          </nav>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
