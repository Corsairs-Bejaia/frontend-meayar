import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Check, X, AlertTriangle, Loader2, FileText,
  ChevronDown, Sparkles, ShieldCheck, ShieldAlert, ExternalLink, Send,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import {
  getVerification,
  getReportByVerification,
  submitDecision,
  addComment,
  streamVerification,
  type VerificationDetail,
  type Report,
  type SseEvent,
} from "@/lib/api/verifications";
import { listDocumentsByVerification, getDocumentUrl, type Document } from "@/lib/api/documents";

export const Route = createFileRoute("/verifications/$id")({
  component: VerificationDetail,
  head: () => ({ meta: [{ title: "Verification — Meayar" }] }),
});

// ─── Score helpers ────────────────────────────────────────────────────────────

const fmtScore = (s: number | null) => (s == null ? 0 : Math.round(s * 100));

function scoreColor(pct: number) {
  if (pct >= 80) return "var(--success)";
  if (pct >= 50) return "var(--warning)";
  return "var(--destructive)";
}

function formatDuration(startIso: string, endIso: string): string {
  const sec = Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
  return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
}

const STEP_LABELS: Record<string, string> = {
  ai_extraction: "AI Extraction",
  cnas_check: "CNAS Cross-check",
};

// ─── Main component ───────────────────────────────────────────────────────────

function VerificationDetail() {
  const { id } = Route.useParams();

  const [verif, setVerif] = useState<VerificationDetail | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(true);
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState<"approved" | "rejected" | "resubmit" | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, dRes] = await Promise.all([
        getVerification(id),
        listDocumentsByVerification(id),
      ]);
      setVerif(vRes.data);
      setDocs(dRes.data);

      // Try to load report (may 404 if no manual review)
      try {
        const rRes = await getReportByVerification(id);
        setReport(rRes.data);
      } catch {
        setReport(null);
      }

      // If still pending, open SSE stream
      if (vRes.data.status === "pending") {
        openStream();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load verification");
    } finally {
      setLoading(false);
    }
  };

  const openStream = () => {
    if (esRef.current) esRef.current.close();
    const es = streamVerification(id);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const evt: SseEvent = JSON.parse(e.data);
        if (evt.type === "completed" || evt.type === "failed") {
          es.close();
          fetchAll();
        }
      } catch { /* ignore parse errors */ }
    };
  };

  useEffect(() => {
    fetchAll();
    return () => { esRef.current?.close(); };
  }, [id]);

  // ── Review actions ─────────────────────────────────────────────────────────

  const handleDecision = async (decision: "approved" | "rejected" | "resubmit") => {
    if (!report) return;
    setReviewLoading(decision);
    setReviewError(null);
    try {
      const res = await submitDecision(report.id, { decision, note: reviewNote || undefined });
      setReport(res.data);
      // Re-fetch verification to update status
      const vRes = await getVerification(id);
      setVerif(vRes.data);
    } catch (e: unknown) {
      setReviewError(e instanceof Error ? e.message : "Failed to submit decision");
    } finally {
      setReviewLoading(null);
    }
  };

  const handleAddComment = async () => {
    if (!report || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await addComment(report.id, commentText.trim());
      setReport((prev) =>
        prev ? { ...prev, comments: [...prev.comments, res.data] } : prev
      );
      setCommentText("");
    } catch { /* silent */ } finally {
      setCommentLoading(false);
    }
  };

  const handleOpenDoc = async (doc: Document) => {
    setOpeningDocId(doc.id);
    try {
      const res = await getDocumentUrl(doc.id);
      window.open(res.data.url, "_blank", "noopener,noreferrer");
    } catch { /* silent */ } finally {
      setOpeningDocId(null);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell title="Verification" subtitle="Loading…">
        <div className="flex flex-col items-center gap-3 mt-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading verification…</p>
        </div>
      </AppShell>
    );
  }

  if (error || !verif) {
    return (
      <AppShell title="Verification" subtitle="Error">
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-10 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <button onClick={fetchAll} className="inline-flex items-center gap-1.5 rounded-md ring-1 ring-border bg-background px-4 py-2 text-sm hover:bg-surface-elevated transition-colors">
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  const score = fmtScore(verif.score);
  const color = scoreColor(score);
  const isPending = verif.status === "pending";
  const isManualReview = report?.status === "pending_review";

  return (
    <AppShell title={verif.id.slice(0, 14) + "…"} subtitle="Verification detail with pipeline steps">
      {/* Header card */}
      <div className="flex flex-wrap items-start gap-6 justify-between rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4 min-w-0">
          <Link
            to="/verifications"
            className="grid place-items-center h-9 w-9 rounded-md bg-surface-elevated ring-1 ring-border hover:bg-accent transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{verif.id}</p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
              Doctor ID: <span className="font-mono text-base">{verif.doctorId}</span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={isPending ? "processing" : verif.decision === "manual_review" ? "review" : verif.decision?.includes("approved") ? "approved" : verif.decision?.includes("rejected") ? "rejected" : "processing"} />
              {verif.completedAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDuration(verif.startedAt, verif.completedAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score ring */}
        {!isPending && (
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                <motion.circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={color} strokeWidth="2.5" strokeLinecap="round"
                  initial={{ strokeDasharray: "0 94" }}
                  animate={{ strokeDasharray: `${(score / 100) * 94} 94` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="font-display text-2xl font-semibold tabular-nums" style={{ color }}>{score}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">/ 100</div>
                </div>
              </div>
            </div>
            <div className="hidden sm:block">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">AI Score</p>
              <p className="mt-1 text-sm">
                {score >= 80 ? "Above auto-approve threshold" : score >= 50 ? "In manual-review band (50–79)" : "Below threshold"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Decision: {verif.decision ?? "—"}</p>
            </div>
          </div>
        )}

        {isPending && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary-glow" />
            Pipeline running…
          </div>
        )}
      </div>

      {/* Pipeline steps */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-base font-semibold">Pipeline</h3>
          <button
            onClick={() => setShowTrace((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            {showTrace ? "Hide" : "Show"} steps
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {verif.steps.map((s, i) => {
            const icon =
              s.status === "completed" ? <Check className="h-3.5 w-3.5" /> :
              s.status === "failed"    ? <X className="h-3.5 w-3.5" /> :
                                         <Loader2 className="h-3.5 w-3.5 animate-spin" />;
            const c =
              s.status === "completed" ? "var(--success)" :
              s.status === "failed"    ? "var(--destructive)" :
                                          "var(--primary-glow)";
            return (
              <div key={s.id} className="flex-1 min-w-[140px] rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <div
                    className="grid place-items-center h-6 w-6 rounded-full ring-1 shrink-0"
                    style={{ background: `color-mix(in oklab, ${c} 18%, transparent)`, color: c, borderColor: c }}
                  >
                    {icon}
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground ml-auto">#{i + 1}</span>
                </div>
                <p className="mt-2 text-xs font-medium">{STEP_LABELS[s.stepType] ?? s.stepType}</p>
                {s.confidence != null && (
                  <p className="font-mono text-[10px] text-muted-foreground mt-1">
                    conf {(s.confidence * 100).toFixed(0)}%
                  </p>
                )}
              </div>
            );
          })}
          {verif.steps.length === 0 && (
            <p className="text-sm text-muted-foreground py-4">No steps recorded yet.</p>
          )}
        </div>

        {/* Trace expandable */}
        <AnimatePresence>
          {showTrace && verif.steps.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-lg border border-border bg-background p-4 font-mono text-xs space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Step trace</p>
                {verif.steps.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 text-muted-foreground">
                    <span className={s.status === "completed" ? "text-success" : s.status === "failed" ? "text-destructive" : "text-primary-glow"}>
                      {s.status === "completed" ? "✓" : s.status === "failed" ? "✗" : "⟳"}
                    </span>
                    <span>{STEP_LABELS[s.stepType] ?? s.stepType}</span>
                    {s.confidence != null && <span>conf {(s.confidence * 100).toFixed(0)}%</span>}
                    {s.startedAt && s.completedAt && (
                      <span className="ml-auto">{formatDuration(s.startedAt, s.completedAt)}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Documents + Report two-col */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Documents panel */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-display text-base font-semibold">Documents</h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            Click to open a presigned download URL (1 h TTL)
          </p>
          {docs.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No documents uploaded for this verification.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleOpenDoc(d)}
                  disabled={openingDocId === d.id}
                  className="relative group rounded-lg border border-border bg-background p-3 text-left hover:border-border-strong hover:bg-surface-elevated transition-all disabled:opacity-60"
                >
                  <div className="aspect-[3/4] rounded-md bg-gradient-to-br from-surface-elevated to-background ring-1 ring-border grid place-items-center mb-2 overflow-hidden">
                    {openingDocId === d.id
                      ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      : <FileText className="h-6 w-6 text-muted-foreground/40" />
                    }
                  </div>
                  <p className="text-xs font-medium truncate capitalize">{d.docType.replace("_", " ")}</p>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">{d.mimeType}</p>
                  <ExternalLink className="absolute top-2 right-2 h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Report summary */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h3 className="font-display text-base font-semibold">Report</h3>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
            AI-generated review report
          </p>
          {report ? (
            <div className="mt-4 space-y-3">
              <ReportStatusBadge status={report.status} />
              {report.contentRaw && (
                <div className="rounded-lg border border-border bg-background p-3 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                    {report.contentRaw}
                  </pre>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {report._count.comments} comment{report._count.comments !== 1 ? "s" : ""}
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              {isPending ? "Report will be generated after the pipeline completes." : "No report for this verification."}
            </p>
          )}
        </div>
      </div>

      {/* Comments thread */}
      {report && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-display text-base font-semibold mb-4">
            Comments <span className="font-mono text-sm font-normal text-muted-foreground">({report.comments.length})</span>
          </h3>
          <div className="space-y-3 mb-4">
            {report.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-medium">{c.author.email}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto font-mono">
                    {new Date(c.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{c.content}</p>
              </div>
            ))}
            {report.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}
          </div>
          {isManualReview && (
            <div className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); }}}
                placeholder="Add a comment…"
                className="flex-1 rounded-md bg-background ring-1 ring-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-primary-glow"
              />
              <button
                onClick={handleAddComment}
                disabled={commentLoading || !commentText.trim()}
                className="grid place-items-center h-9 w-9 rounded-md bg-primary/15 ring-1 ring-primary/30 text-primary-glow hover:bg-primary/25 transition-colors disabled:opacity-40"
              >
                {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual review actions */}
      {isManualReview && report && (
        <div className="mt-6 rounded-xl border border-warning/30 bg-warning/10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-display text-base font-semibold">Awaiting manual decision</h3>
          </div>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Add review notes (optional)…"
            rows={3}
            className="w-full rounded-md bg-background ring-1 ring-border px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-primary mb-3"
          />
          {reviewError && (
            <p className="text-sm text-destructive mb-3 flex items-center gap-1.5">
              <X className="h-3.5 w-3.5" /> {reviewError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              id="review-approve-btn"
              disabled={!!reviewLoading}
              onClick={() => handleDecision("approved")}
              className="inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {reviewLoading === "approved" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </button>
            <button
              id="review-reject-btn"
              disabled={!!reviewLoading}
              onClick={() => handleDecision("rejected")}
              className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {reviewLoading === "rejected" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              Reject
            </button>
            <button
              id="review-resubmit-btn"
              disabled={!!reviewLoading}
              onClick={() => handleDecision("resubmit")}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-elevated px-4 py-2 text-sm font-medium ring-1 ring-border hover:bg-accent transition-colors disabled:opacity-50"
            >
              {reviewLoading === "resubmit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Request resubmission
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ReportStatusBadge({ status }: { status: "pending_review" | "reviewed" }) {
  const isPending = status === "pending_review";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium ring-1 ${isPending ? "bg-warning/15 text-warning ring-warning/25" : "bg-success/15 text-success ring-success/25"}`}>
      {isPending ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
      {isPending ? "Pending review" : "Reviewed"}
    </span>
  );
}
