import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronRight, Eye, Plus, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, ScoreBar, getBadgeStatus } from "@/components/status-badge";
import { DoctorDetailModal } from "@/components/doctor-detail-modal";
import { ApiKeyFormModal } from "@/components/api-keys-form";
import { ApiKeyCopyModal } from "@/components/api-key-copy-modal";
import { ApiKeysTable } from "@/components/api-keys-table";
import { Button } from "@/components/ui/button";

import { getDashboardStats, getDashboardChart, type DashboardStats, type ChartDataPoint } from "@/lib/api/dashboard";
import { listVerifications, type Verification } from "@/lib/api/verifications";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Meayar" }] }),
});

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [recentVerifications, setRecentVerifications] = useState<Verification[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiErrors, setApiErrors] = useState<{ stats?: boolean; chart?: boolean; verifs?: boolean }>({});

  const [selectedDoctor, setSelectedDoctor] = useState<Verification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, chartRes, verifsRes] = await Promise.allSettled([
        getDashboardStats(),
        getDashboardChart(),
        listVerifications(1, 20),
      ]);

      const newErrors: { stats?: boolean; chart?: boolean; verifs?: boolean } = {};

      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value.data);
      } else {
        console.error("Failed to fetch stats", statsRes);
        newErrors.stats = true;
      }

      if (chartRes.status === "fulfilled" && chartRes.value) {
        setChartData(chartRes.value.data);
      } else {
        console.error("Failed to fetch chart", chartRes);
        newErrors.chart = true;
      }

      if (verifsRes.status === "fulfilled" && verifsRes.value) {
        setRecentVerifications(verifsRes.value.data.items);
      } else {
        console.error("Failed to fetch verifications", verifsRes);
        newErrors.verifs = true;
      }
      
      setApiErrors(newErrors);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openDoctorModal = (doctor: Verification) => {
    setSelectedDoctor(doctor);
    setModalOpen(true);
  };

  const handleApiKeySuccess = (rawKey: string) => {
    setFormModalOpen(false);
    setTimeout(() => {
      setNewRawKey(rawKey);
    }, 150);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleCopyModalClose = (open: boolean) => {
    if (!open) {
      setNewRawKey(null);
    }
  };

  const approvedDoctors = useMemo(() => {
    return recentVerifications
      .filter((v) => v.decision === "approved" || v.decision === "human_approved")
      .slice(0, 4);
  }, [recentVerifications]);

  const distribution = useMemo(() => {
    if (!stats || !stats.verifications) return [];
    return [
      { name: "Completed", value: stats.verifications.completed || 0, color: "var(--success)" },
      { name: "Pending", value: (stats.verifications.pending || 0) + (stats.verifications.running || 0), color: "var(--warning)" },
      { name: "Failed", value: stats.verifications.failed || 0, color: "var(--destructive)" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const approvalRate = stats && stats.verifications && stats.verifications.total > 0
    ? Math.round(((stats.verifications.completed || 0) / stats.verifications.total) * 100)
    : 0;

  if (loading) {
    return (
      <AppShell title="Command center" subtitle="Loading dashboard...">
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p>Loading your metrics...</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Command center" subtitle="Error">
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline" className="mt-2">Retry</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell title="Command center" subtitle="Real-time view of every verification flowing through your tenant">
        {/* KPI grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total verifications" value={stats?.verifications?.total != null ? stats.verifications.total.toLocaleString() : "—"} change={0} accent="primary" hideTrend />
          <KpiCard label="Approval rate" value={stats?.verifications?.total ? `${approvalRate}%` : "—"} change={0} accent="success" ring={approvalRate} hideTrend />
          <KpiCard label="Pending reviews" value={stats?.verifications?.pending != null ? stats.verifications.pending.toString() : "—"} change={0} accent="warning" hideTrend />
          <KpiCard label="Active Doctors" value={stats?.doctors?.active != null ? stats.doctors.active.toString() : "—"} change={0} accent="primary" inverted hideTrend />
        </div>

        {/* Approved doctors (3D cards) */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <PanelHeader title="Approved doctors" subtitle="Most recent approvals" />
            <span className="text-xs text-muted-foreground font-mono">{approvedDoctors.length} recent</span>
          </div>
          {apiErrors.verifs ? (
            <div className="mt-4 py-8 text-center border border-destructive/30 bg-destructive/5 rounded-xl text-destructive text-sm flex flex-col items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Failed to load recent doctors
            </div>
          ) : approvedDoctors.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {approvedDoctors.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    onClick={() => openDoctorModal(v)}
                    className="w-full group card-3d rounded-xl border border-border bg-surface p-4 text-left hover:border-border-strong transition-colors"
                  >
                    <div className="card-3d-layer">
                      <div className="flex items-start gap-3">
                        <div className="grid place-items-center h-10 w-10 rounded-lg bg-success/15 ring-1 ring-success/25 text-success font-display text-sm font-semibold">
                          {v.doctorId.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{v.doctorId.slice(0, 10)}…</p>
                          <p className="text-xs text-muted-foreground">ID</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
                          <p className="font-display text-lg font-semibold tabular-nums">{Math.round((v.score ?? 0) * 100)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">{new Date(v.startedAt).toLocaleDateString()}</span>
                        <StatusBadge status="approved" />
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-glow">
                          <Eye className="h-3.5 w-3.5" /> View details
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="mt-4 py-8 text-center border border-border rounded-xl bg-surface text-muted-foreground text-sm">
              No recent approved doctors found.
            </div>
          )}
        </div>

        {/* Charts row */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel className="lg:col-span-2 p-5">
            <PanelHeader title="Verification volume" subtitle="Last 30 days" />
            <div className="mt-4 h-[260px]">
              {apiErrors.chart ? (
                <div className="h-full flex flex-col items-center justify-center text-destructive text-sm border border-destructive/20 bg-destructive/5 rounded-lg">
                  <AlertCircle className="h-5 w-5 mb-2" />
                  Failed to load chart data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="g-total" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary-glow)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--primary-glow)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--muted-foreground)" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      cursor={{ stroke: "var(--border-strong)" }}
                    />
                    <Line type="monotone" dataKey="total" stroke="var(--primary-glow)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="approved" stroke="var(--success)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rejected" stroke="var(--destructive)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            {!apiErrors.chart && (
              <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
                <Legend color="var(--primary-glow)" label="Total" />
                <Legend color="var(--success)" label="Approved" />
                <Legend color="var(--destructive)" label="Rejected" />
              </div>
            )}
          </Panel>

          <Panel className="p-5">
            <PanelHeader title="Status distribution" subtitle="All-time" />
            <div className="mt-4 h-[200px]">
              {apiErrors.stats ? (
                <div className="h-full flex flex-col items-center justify-center text-destructive text-sm border border-destructive/20 bg-destructive/5 rounded-lg">
                  <AlertCircle className="h-5 w-5 mb-2" />
                  Failed to load stats
                </div>
              ) : distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribution} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={3} stroke="none">
                      {distribution.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data
                </div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {distribution.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-mono tabular-nums">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* API Keys */}
        <Panel className="mt-6">
          <div className="flex items-center justify-between p-5 pb-3">
            <PanelHeader title="API Keys" subtitle="Manage your API keys" />
            <Button
              size="sm"
              onClick={() => setFormModalOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Key
            </Button>
          </div>
          <div className="px-5 pb-5">
            <ApiKeysTable refreshTrigger={refreshTrigger} />
          </div>
        </Panel>

        {/* Recent table */}
        <Panel className="mt-6">
          <div className="flex items-center justify-between p-5 pb-3">
            <PanelHeader title="Recent verifications" subtitle="Live feed" />
            <Link to="/verifications" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border bg-surface/50">
                  {["Ref", "Doctor ID", "Status", "Score", "Decision", "Started", ""].map((h) => (
                    <th key={h} className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground px-5 py-2.5 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apiErrors.verifs ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-destructive bg-destructive/5">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Failed to load recent verifications
                      </div>
                    </td>
                  </tr>
                ) : recentVerifications.slice(0, 8).map((v, i) => {
                  const score = v.score != null ? Math.round(v.score * 100) : null;
                  return (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-border/60 hover:bg-surface/40 transition-colors group"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{v.id.slice(0, 12)}…</td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{v.doctorId.slice(0, 10)}…</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={getBadgeStatus(v)} />
                      </td>
                      <td className="px-5 py-3">
                        {v.status === "pending" ? <span className="text-muted-foreground text-xs">—</span> : <ScoreBar score={score ?? 0} />}
                      </td>
                      <td className="px-5 py-3 text-xs uppercase text-muted-foreground">{v.decision || "—"}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(v.startedAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <Link
                          to="/verifications/$id"
                          params={{ id: v.id }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-grid place-items-center h-7 w-7 rounded-md bg-surface-elevated ring-1 ring-border hover:bg-primary/15 hover:ring-primary/30"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })}
                {recentVerifications.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                      No recent verifications.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <DoctorDetailModal open={modalOpen} onOpenChange={setModalOpen} doctor={selectedDoctor} />
        <ApiKeyFormModal
          open={formModalOpen}
          onOpenChange={setFormModalOpen}
          onSuccess={handleApiKeySuccess}
        />
        <ApiKeyCopyModal
          open={!!newRawKey}
          onOpenChange={handleCopyModalClose}
          rawKey={newRawKey}
        />
      </AppShell>
    </>
  );
}

function KpiCard({
  label, value, change, accent, inverted = false, ring, hideTrend = false
}: {
  label: string; value: string; change: number;
  accent: "primary" | "success" | "warning"; inverted?: boolean; ring?: number;
  hideTrend?: boolean;
}) {
  const positive = inverted ? change < 0 : change > 0;
  const accentVar = accent === "primary" ? "var(--primary-glow)" : accent === "success" ? "var(--success)" : "var(--warning)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-xl border border-border bg-surface p-5 overflow-hidden"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-semibold tabular-nums">{value}</p>
        {ring !== undefined && (
          <div className="relative h-12 w-12">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="14" fill="none"
                stroke={accentVar} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(ring / 100) * 88} 88`}
                style={{ filter: `drop-shadow(0 0 4px ${accentVar})` }}
              />
            </svg>
          </div>
        )}
      </div>
      {!hideTrend && (
        <div className={`mt-3 inline-flex items-center gap-1 font-mono text-[11px] ${positive ? "text-success" : "text-destructive"}`}>
          {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(change)}% vs last week
        </div>
      )}
    </motion.div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-surface ${className}`}>{children}</div>;
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </div>
  );
}
