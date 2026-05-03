export type StatusBadgeType = "approved" | "review" | "rejected" | "processing" | "pending";

const map: Record<StatusBadgeType, { label: string; className: string; dot: string }> = {
  approved: { label: "Approved", className: "bg-success/15 text-success ring-success/30", dot: "bg-success" },
  review: { label: "Review", className: "bg-warning/15 text-warning ring-warning/30", dot: "bg-warning" },
  rejected: { label: "Rejected", className: "bg-destructive/15 text-destructive ring-destructive/30", dot: "bg-destructive" },
  processing: { label: "Processing", className: "bg-primary/15 text-primary-glow ring-primary/30", dot: "bg-primary-glow" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground" },
};

export function getBadgeStatus(v: { status: string; decision: string | null }): StatusBadgeType {
  if (v.status === "pending") return "processing";
  if (v.status === "failed") return "rejected";
  if (v.status === "completed") {
    if (v.decision === "approved" || v.decision === "human_approved") return "approved";
    if (v.decision === "rejected" || v.decision === "human_rejected") return "rejected";
    if (v.decision === "manual_review") return "review";
    return "approved"; // fallback
  }
  return "pending";
}

export function StatusBadge({ status }: { status: StatusBadgeType | string }) {
  const s = map[status as StatusBadgeType] || map["pending"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 ring-inset font-mono text-[10px] uppercase tracking-wider ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${status === "processing" ? "animate-pulse-dot" : ""}`} />
      {s.label}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 85 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="relative flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
        />
      </div>
      <span className="font-mono text-xs tabular-nums" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
