import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Search, Filter, Download, Eye, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, ScoreBar } from "@/components/status-badge";
import {
  listVerifications,
  type Verification,
  type VerificationDecision,
} from "@/lib/api/verifications";

export const Route = createFileRoute("/verifications/")({
  component: VerificationsList,
  head: () => ({ meta: [{ title: "Verifications — Meayar" }] }),
});

// ─── UI filter keys ───────────────────────────────────────────────────────────

type UiFilter = "all" | "processing" | "approved" | "review" | "rejected";

const STATUS_FILTERS: { key: UiFilter; label: string }[] = [
  { key: "all",        label: "All" },
  { key: "processing", label: "Processing" },
  { key: "approved",   label: "Approved" },
  { key: "review",     label: "Review" },
  { key: "rejected",   label: "Rejected" },
];

/** Map a backend (status, decision) pair to a UI filter bucket */
function toUiFilter(v: Verification): UiFilter {
  if (v.status === "pending") return "processing";
  if (v.status === "failed")  return "rejected";
  // completed → decision drives the bucket
  const d: VerificationDecision = v.decision;
  if (d === "approved" || d === "human_approved")   return "approved";
  if (d === "rejected" || d === "human_rejected")   return "rejected";
  if (d === "manual_review")                        return "review";
  return "processing"; // resubmit_requested or null
}

/** Map a UI filter bucket to a StatusBadge-compatible status string */
function toStatusBadge(v: Verification): string {
  return toUiFilter(v) === "review" ? "review" : toUiFilter(v);
}

/** Format score 0.0–1.0 → 0–100 for display */
const fmtScore = (s: number | null) => (s == null ? 0 : Math.round(s * 100));

/** Format ISO date to relative/absolute string */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)    return "just now";
  if (diffMin < 60)   return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)     return `${diffH} h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

function VerificationsList() {
  const [items, setItems]           = useState<Verification[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<UiFilter>("all");
  const [query, setQuery]           = useState("");

  const fetchPage = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listVerifications(p, PAGE_LIMIT);
      setItems(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load verifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(1); }, []);

  // Client-side filter + search on current page data
  const filtered = useMemo(() => {
    return items.filter((v) => {
      if (filter !== "all" && toUiFilter(v) !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        const matchId = v.id.toLowerCase().includes(q);
        const matchDoc = v.doctorId.toLowerCase().includes(q);
        if (!matchId && !matchDoc) return false;
      }
      return true;
    });
  }, [items, filter, query]);

  return (
    <AppShell
      title="Verifications"
      subtitle={`${(total ?? 0).toLocaleString()} total records`}
    >
      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-surface p-3 flex flex-wrap items-center gap-2">
        {/* Status pills */}
        <div className="flex items-center gap-1 rounded-md bg-background p-0.5 ring-1 ring-border">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              id={`filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={`relative px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                filter === f.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter === f.key && (
                <motion.div
                  layoutId="filter-active"
                  className="absolute inset-0 bg-primary/15 ring-1 ring-primary/30 rounded"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[180px] flex items-center gap-2 rounded-md bg-background px-3 py-1.5 ring-1 ring-border">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            id="verif-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by verification ID or doctor ID…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Actions */}
        <button className="inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-surface-elevated transition-colors">
          <Filter className="h-3.5 w-3.5" /> Date range
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary-glow ring-1 ring-primary/30 hover:bg-primary/25 transition-colors">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        <button
          onClick={() => fetchPage(page)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-surface-elevated transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => fetchPage(page)}
              className="underline text-xs shrink-0 hover:no-underline"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="mt-4 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60">
                {["Ref", "Doctor ID", "Status", "Score", "Decision", "Started", "Duration", ""].map((h) => (
                  <th
                    key={h}
                    className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-5 py-3 text-left font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton rows */}
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-3">
                      <div className="h-3 rounded-full bg-surface-elevated animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Data rows */}
              {!loading && (
                <AnimatePresence>
                  {filtered.map((v, i) => {
                    const uiBucket = toUiFilter(v);
                    const score = fmtScore(v.score);
                    const dur = v.completedAt
                      ? formatDuration(v.startedAt, v.completedAt)
                      : "—";

                    return (
                      <motion.tr
                        key={v.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/60 last:border-0 hover:bg-surface-elevated/40 transition-colors group"
                      >
                        {/* Ref (short ID) */}
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                          {v.id.slice(0, 12)}…
                        </td>

                        {/* Doctor ID */}
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                          {v.doctorId.slice(0, 10)}…
                        </td>

                        {/* Status badge */}
                        <td className="px-5 py-3">
                          <StatusBadge status={toStatusBadge(v) as Parameters<typeof StatusBadge>[0]["status"]} />
                        </td>

                        {/* Score bar */}
                        <td className="px-5 py-3">
                          {uiBucket === "processing"
                            ? <span className="text-xs text-muted-foreground">—</span>
                            : <ScoreBar score={score} />
                          }
                        </td>

                        {/* Decision chip */}
                        <td className="px-5 py-3">
                          <DecisionChip decision={v.decision} />
                        </td>

                        {/* Started at */}
                        <td className="px-5 py-3 text-muted-foreground text-xs">
                          {fmtDate(v.startedAt)}
                        </td>

                        {/* Duration */}
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                          {dur}
                        </td>

                        {/* Open link */}
                        <td className="px-5 py-3">
                          <Link
                            to="/verifications/$id"
                            params={{ id: v.id }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-grid place-items-center h-7 w-7 rounded-md bg-surface-elevated ring-1 ring-border hover:bg-primary/15 hover:ring-primary/30"
                            aria-label="View verification"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}

              {/* Empty */}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    {query || filter !== "all"
                      ? "No verifications match your filters"
                      : "No verifications yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface/50">
          <p className="text-xs text-muted-foreground">
            Page <span className="text-foreground font-medium">{page ?? 1}</span> of{" "}
            <span className="text-foreground font-medium">{totalPages ?? 1}</span>
            {" · "}
            <span className="text-foreground font-medium">{(total ?? 0).toLocaleString()}</span> total
          </p>
          <div className="flex items-center gap-1">
            <button
              id="verif-prev-page"
              onClick={() => fetchPage(page - 1)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded ring-1 ring-border bg-background text-muted-foreground disabled:opacity-40 hover:bg-surface-elevated transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchPage(p)}
                disabled={loading}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  p === page
                    ? "ring-1 ring-primary/30 bg-primary/15 text-primary-glow"
                    : "ring-1 ring-border bg-background hover:bg-surface-elevated"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              id="verif-next-page"
              onClick={() => fetchPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded ring-1 ring-border bg-background text-muted-foreground disabled:opacity-40 hover:bg-surface-elevated transition-colors"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(startIso: string, endIso: string): string {
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalSec = Math.floor(diffMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

const DECISION_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  approved:            { label: "AI Approved",    className: "bg-success/15 text-success ring-success/25" },
  human_approved:      { label: "Approved",        className: "bg-success/15 text-success ring-success/25" },
  rejected:            { label: "AI Rejected",     className: "bg-destructive/15 text-destructive ring-destructive/25" },
  human_rejected:      { label: "Rejected",        className: "bg-destructive/15 text-destructive ring-destructive/25" },
  manual_review:       { label: "Manual review",   className: "bg-warning/15 text-warning ring-warning/25" },
  resubmit_requested:  { label: "Resubmit",        className: "bg-muted/50 text-muted-foreground ring-border" },
};

function DecisionChip({ decision }: { decision: VerificationDecision }) {
  if (!decision) return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = DECISION_CONFIG[decision];
  if (!cfg) return <span className="font-mono text-xs text-muted-foreground">{decision}</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ring-1 ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
