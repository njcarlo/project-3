"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/prices", label: "Prices" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/review", label: "Review queue" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <div className="border-b border-card-border">
        <div className="mx-auto flex max-w-4xl gap-1 px-4 py-2 text-sm">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-3 py-1.5 transition-colors ${
                pathname === tab.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:bg-card-border/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
