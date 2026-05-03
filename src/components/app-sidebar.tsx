import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  KeyRound,
  Settings,
  Inbox,
  Activity,
  Webhook,
} from "lucide-react";
import { listReports } from "@/lib/api/verifications";
import logo from "@/assets/logo.svg";

const baseItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/verifications", label: "Verifications", icon: ShieldCheck },
  { to: "/review", label: "Review queue", icon: Inbox },
  { to: "/templates", label: "Templates", icon: FileText },
  { to: "/api-keys", label: "API keys", icon: KeyRound },
  { to: "/webhooks", label: "Webhooks", icon: Webhook },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchPending = async () => {
      try {
        const res = await listReports(1, 1, "pending_review");
        if (mounted) setPendingReviewCount(res.data.total);
      } catch {
        // silent
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 60000); // Poll every minute
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const items = baseItems.map((item) => {
    if (item.to === "/review" && pendingReviewCount !== null && pendingReviewCount > 0) {
      return { ...item, badge: pendingReviewCount };
    }
    return item;
  });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar/60 backdrop-blur-xl">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <img src={logo} alt="Meayar Logo" className="h-8 w-8 object-contain" />
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[15px] font-semibold tracking-tight">Meayar</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">v2.4 · live</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
        {items.map((item) => {
          const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to as string}
              className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-md bg-primary/15 ring-1 ring-inset ring-primary/30"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon className={`relative h-4 w-4 transition-colors ${active ? "text-primary-glow" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className={`relative flex-1 ${active ? "text-foreground font-medium" : "text-muted-foreground group-hover:text-foreground"}`}>
                {item.label}
              </span>
              {"badge" in item && item.badge ? (
                <span className="relative rounded-full bg-warning/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-warning">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-surface-elevated/60 px-3 py-2.5 ring-1 ring-border">
          <div className="grid place-items-center h-8 w-8 rounded-md bg-gradient-to-br from-primary to-primary-glow font-display text-[13px] font-semibold text-primary-foreground">
            SK
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium">Sara Kebir</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">CHU Algiers · Admin</p>
          </div>
          <Activity className="h-3.5 w-3.5 text-success animate-pulse-dot" />
        </div>
      </div>
    </aside>
  );
}
