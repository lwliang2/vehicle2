import { Link } from "@tanstack/react-router";
import { CheckLtaUpdatesButton } from "@/components/CheckLtaUpdatesButton";

const TABS = [
  { to: "/", label: "COE Bidding" },
  { to: "/vehicle-population", label: "Vehicle Population" },
] as const;

export function DashboardTabs() {
  return (
    <nav className="flex items-center justify-between gap-2 border-b border-border bg-background px-6 md:px-8">
      <div className="flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: true }}
            activeProps={{
              className: "border-primary text-foreground",
            }}
            inactiveProps={{
              className: "border-transparent text-muted-foreground hover:text-foreground",
            }}
            className="-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors"
          >
            {t.label}
          </Link>
        ))}
      </div>
      <CheckLtaUpdatesButton />
    </nav>
  );
}
