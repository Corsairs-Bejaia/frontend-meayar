import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Search, AlertCircle, Loader2, RefreshCw, Eye,
  ChevronLeft, ChevronRight, MessageSquare, Clock, User,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { listReports, type Report } from "@/lib/api/verifications";

export const Route = createFileRoute("/review/")({
  component: ReviewQueuePage,
  head: () => ({ meta: [{ title: "Review Queue — Meayar" }] }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtScore(s: number | null) {
  return s == null ? "—" : `${Math.round(s * 100)}`;
}

type QueueFilter = "all" | "pending_review" | "reviewed";

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: "all",            label: "All" },
  { key: "pending_review", label: "Pending" },
  { key: "reviewed",       label: "Reviewed" },
];

const PAGE_LIMIT = 20;

// ─── Component ────────────────────────────────────────────────────────────────

function ReviewQueuePage() {
  const [items, setItems]           = useState<Report[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [filter, setFilter]         = useState<QueueFilter>("all");
  const [query, setQuery]           = useState("");

  const fetchPage = async (p: number, statusFilter: QueueFilter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await listReports(
        p,
        PAGE_LIMIT,
        statusFilter === "all" ? undefined : statusFilter
      );
      setItems(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setPage(res.data.page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(1, filter); }, [filter]);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((r) => {
      const doc = r.verification?.doctor;
      return (
        r.id.toLowerCase().includes(q) ||
        r.verificationId.toLowerCase().includes(q) ||
        doc?.fullNameFr?.toLowerCase().includes(q) ||
        doc?.nationalIdNumber?.includes(q)
      );
    });
  }, [items, query]);

  const pendingCount = items.filter((r) => r.status === "pending_review").length;

  return (
    <AppShell
      title="Review Queue"
      subtitle={`${total.toLocaleString()} reports · ${pendingCount} pending decision`}
    >
      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-surface p-3 flex flex-wrap items-center gap-2">
        {/* Status pills */}
        <div className="flex items-center gap-1 rounded-md bg-background p-0.5 ring-1 ring-border">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              id={`review-filter-${f.key}`}
              onClick={() => { setFilter(f.key); }}
              className={`relative px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                filter === f.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter === f.key && (
                <motion.div
                  layoutId="review-filter-active"
                  className="absolute inset-0 bg-primary/15 ring-1 ring-primary/30 rounded"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{f.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2 rounded-md bg-background px-3 py-1.5 ring-1 ring-border">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            id="review-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by doctor name, NIN, or report ID…"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <button
          onClick={() => fetchPage(page, filter)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-background px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:bg-surface-elevated transition-colors disabled:opacity-50"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Error */}
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
            <button onClick={() => fetchPage(page, filter)} className="underline text-xs hover:no-underline shrink-0">Retry</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards grid */}
      <div className="mt-4 space-y-3">
        {/* Loading skeletons */}
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-surface-elevated shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-surface-elevated rounded-full w-1/3" />
                <div className="h-3 bg-surface-elevated rounded-full w-1/2" />
              </div>
              <div className="h-6 w-20 bg-surface-elevated rounded-full" />
            </div>
          </div>
        ))}

        {/* Report cards */}
        {!loading && (
          <AnimatePresence>
            {filtered.map((report, i) => (
              <ReportCard key={report.id} report={report} index={i} />
            ))}
          </AnimatePresence>
        )}

        {/* Empty state */}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {filter === "pending_review" ? "No reports awaiting review" : "No reports found"}
            </p>
            {query && <p className="text-xs mt-1">Try adjusting your search</p>}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page <span className="text-foreground font-medium">{page}</span> of{" "}
            <span className="text-foreground font-medium">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchPage(page - 1, filter)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded ring-1 ring-border bg-background text-muted-foreground disabled:opacity-40 hover:bg-surface-elevated transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              onClick={() => fetchPage(page + 1, filter)}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded ring-1 ring-border bg-background text-muted-foreground disabled:opacity-40 hover:bg-surface-elevated transition-colors"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({ report, index }: { report: Report; index: number }) {
  const isPending = report.status === "pending_review";
  const doctor = report.verification?.doctor;
  const score = report.verification?.score;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: index * 0.04 }}
      className={`rounded-xl border bg-surface p-5 transition-all hover:shadow-md hover:shadow-black/10 ${
        isPending
          ? "border-warning/40 hover:border-warning/60"
          : "border-border hover:border-border-strong"
      }`}
    >
      <div className="flex flex-wrap items-start gap-4 justify-between">
        {/* Doctor info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`grid place-items-center h-10 w-10 rounded-full shrink-0 ring-1 ${
            isPending
              ? "bg-warning/15 ring-warning/30 text-warning"
              : "bg-success/15 ring-success/30 text-success"
          }`}>
            <User className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold truncate">
              {doctor?.fullNameFr ?? `Doctor ${report.verification?.doctor?.id?.slice(0, 8) ?? "Unknown"}`}
            </p>
            {doctor?.fullNameAr && (
              <p className="text-sm text-muted-foreground" dir="rtl">{doctor.fullNameAr}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
              {doctor?.nationalIdNumber && <span>NIN: {doctor.nationalIdNumber.slice(0, 8)}…</span>}
              {doctor?.specialty && <span>· {doctor.specialty}</span>}
            </div>
          </div>
        </div>

        {/* Status + score */}
        <div className="flex items-center gap-3 shrink-0">
          {score != null && (
            <div className="text-center">
              <p className={`font-display text-xl font-semibold tabular-nums ${
                Math.round(score * 100) >= 80 ? "text-success" :
                Math.round(score * 100) >= 50 ? "text-warning" : "text-destructive"
              }`}>
                {fmtScore(score)}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</p>
            </div>
          )}
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-medium ring-1 ${
            isPending
              ? "bg-warning/15 text-warning ring-warning/25"
              : "bg-success/15 text-success ring-success/25"
          }`}>
            {isPending ? "Pending review" : "Reviewed"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {fmtDate(report.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {report._count.comments} comment{report._count.comments !== 1 ? "s" : ""}
          </span>
          {report.decision && (
            <span className="font-mono text-[10px] uppercase tracking-wider">
              Decision: {report.decision}
            </span>
          )}
        </div>
        <Link
          to="/verifications/$id"
          params={{ id: report.verificationId }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-glow hover:underline"
        >
          <Eye className="h-3.5 w-3.5" /> Open verification
        </Link>
      </div>
    </motion.div>
  );
}
