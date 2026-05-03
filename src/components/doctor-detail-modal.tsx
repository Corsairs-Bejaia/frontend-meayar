import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge, getBadgeStatus } from "@/components/status-badge";
import { X, CheckCircle, Clock, Award } from "lucide-react";
import type { Verification } from "@/lib/api/verifications";
import { Link } from "@tanstack/react-router";

interface DoctorDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Verification | null;
}

export function DoctorDetailModal({ open, onOpenChange, doctor }: DoctorDetailModalProps) {
  if (!doctor) return null;

  const bgGradient = doctor.status === "completed" 
    ? "from-success/20 to-success/5" 
    : doctor.status === "pending"
    ? "from-warning/20 to-warning/5"
    : "from-destructive/20 to-destructive/5";

  const scoreDisplay = doctor.score != null ? Math.round(doctor.score * 100) : "—";

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const calculateProcessingTime = (start: string, end: string | null) => {
    if (!end) return "Processing...";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const sec = Math.floor(diff / 1000);
    return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
  };

  const processingTime = calculateProcessingTime(doctor.startedAt, doctor.completedAt);
  const submittedAt = formatTime(doctor.startedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="relative">
          <div className="absolute -inset-6 opacity-40 blur-xl bg-gradient-to-br from-primary/30 to-transparent rounded-2xl" />
          <div className="relative">
            <DialogTitle className="text-2xl">Doctor ID: {doctor.doctorId.slice(0, 10)}…</DialogTitle>
            <DialogDescription className="text-base mt-2">Verification details</DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status and score row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-surface p-4 border border-border">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Status</p>
              <StatusBadge status={getBadgeStatus(doctor)} />
            </div>

            <div className="rounded-lg bg-surface p-4 border border-border">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Score</p>
              <div className="flex items-baseline gap-1">
                <p className="font-display text-3xl font-semibold tabular-nums">{scoreDisplay}</p>
                <span className="text-muted-foreground">/100</span>
              </div>
            </div>

            <div className="rounded-lg bg-surface p-4 border border-border">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Ref</p>
              <p className="font-mono text-sm text-foreground">{doctor.id.slice(0, 12)}…</p>
            </div>
          </div>

          {/* Timeline info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-surface p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-primary-glow" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Processing time</p>
              </div>
              <p className="font-display text-lg font-semibold">{processingTime}</p>
            </div>

            <div className="rounded-lg bg-surface p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-success" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Started</p>
              </div>
              <p className="font-display text-lg font-semibold">{submittedAt}</p>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-lg bg-gradient-to-br border border-border p-6 space-y-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">Overview</h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">Doctor ID</p>
                <p className="font-mono text-foreground">{doctor.doctorId}</p>
              </div>

              <div>
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">Decision</p>
                <p className="text-foreground font-medium uppercase text-xs">{doctor.decision || "Pending"}</p>
              </div>

              <div>
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">Verification ID</p>
                <p className="font-mono text-foreground">{doctor.id}</p>
              </div>

              <div>
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider mb-1">Tenant ID</p>
                <p className="font-mono text-foreground">{doctor.tenantId}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Link 
              to="/verifications/$id" 
              params={{ id: doctor.id }}
              className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 font-medium text-sm hover:bg-primary/90 transition-colors text-center"
            >
              View Full Report
            </Link>
            <button 
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-lg border border-border bg-surface text-foreground px-4 py-2.5 font-medium text-sm hover:bg-surface-elevated transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
