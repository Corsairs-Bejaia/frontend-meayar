import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Plus, Trash2, RefreshCw, Loader2, AlertCircle, Webhook,
  Eye, EyeOff, Check, X, Copy, ChevronDown, Activity,
  ExternalLink, Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  listEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  getEndpointSecret,
  rotateEndpointSecret,
  listDeliveries,
  WEBHOOK_EVENT_TYPES,
  type WebhookEndpoint,
  type WebhookDelivery,
} from "@/lib/api/webhooks";

export const Route = createFileRoute("/webhooks/")({
  component: WebhooksPage,
  head: () => ({ meta: [{ title: "Webhooks — Meayar" }] }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const fetchEndpoints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listEndpoints();
      setEndpoints(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEndpoints(); }, []);

  const handleCreated = (ep: WebhookEndpoint) => {
    setEndpoints((prev) => [ep, ...prev]);
    setCreateOpen(false);
  };

  const handleDeleted = (id: string) => {
    setEndpoints((prev) => prev.filter((e) => e.id !== id));
  };

  const handleUpdated = (ep: WebhookEndpoint) => {
    setEndpoints((prev) => prev.map((e) => (e.id === ep.id ? ep : e)));
  };

  return (
    <>
      <AppShell
        title="Webhooks"
        subtitle="Receive real-time HTTP notifications when verification events occur"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-3 flex-1 mr-4 max-w-sm">
            <Zap className="h-4 w-4 text-primary-glow shrink-0" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Active endpoints</p>
              <p className="font-display text-xl font-semibold tabular-nums">
                {endpoints.filter((e) => e.isActive).length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEndpoints}
              disabled={loading}
              className="border-border"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              id="create-webhook-btn"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add endpoint
            </Button>
          </div>
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
              <button onClick={fetchEndpoints} className="underline text-xs hover:no-underline">Retry</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeletons */}
        {loading && (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-surface-elevated shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-surface-elevated rounded-full w-1/2" />
                    <div className="h-3 bg-surface-elevated rounded-full w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Endpoint list */}
        {!loading && (
          <div className="mt-4 space-y-3">
            <AnimatePresence>
              {endpoints.map((ep, i) => (
                <EndpointCard
                  key={ep.id}
                  endpoint={ep}
                  index={i}
                  isExpanded={expanded === ep.id}
                  onToggle={() => setExpanded(expanded === ep.id ? null : ep.id)}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                />
              ))}
            </AnimatePresence>

            {endpoints.length === 0 && !error && (
              <div className="py-16 text-center text-muted-foreground">
                <Webhook className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No webhook endpoints yet</p>
                <p className="text-xs mt-1">Add an endpoint to start receiving event notifications</p>
                <Button onClick={() => setCreateOpen(true)} className="mt-4 inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add first endpoint
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Event types reference */}
        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
          <h3 className="font-display text-sm font-semibold mb-3">Available event types</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {WEBHOOK_EVENT_TYPES.map((evt) => (
              <div key={evt} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2">
                <Activity className="h-3.5 w-3.5 text-primary-glow shrink-0" />
                <span className="font-mono text-xs">{evt}</span>
              </div>
            ))}
          </div>
        </div>
      </AppShell>

      <CreateEndpointModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreated}
      />
    </>
  );
}

// ─── Endpoint Card ────────────────────────────────────────────────────────────

interface EndpointCardProps {
  endpoint: WebhookEndpoint;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdated: (ep: WebhookEndpoint) => void;
  onDeleted: (id: string) => void;
}

function EndpointCard({ endpoint, index, isExpanded, onToggle, onUpdated, onDeleted }: EndpointCardProps) {
  const [deleting, setDeleting]       = useState(false);
  const [toggling, setToggling]       = useState(false);
  const [secret, setSecret]           = useState<string | null>(null);
  const [showSecret, setShowSecret]   = useState(false);
  const [secretLoading, setSecretLoading] = useState(false);
  const [rotating, setRotating]       = useState(false);
  const [deliveries, setDeliveries]   = useState<WebhookDelivery[] | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [copied, setCopied]           = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete webhook endpoint "${endpoint.url}"?`)) return;
    setDeleting(true);
    try {
      await deleteEndpoint(endpoint.id);
      onDeleted(endpoint.id);
    } catch { setDeleting(false); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await updateEndpoint(endpoint.id, { isActive: !endpoint.isActive });
      onUpdated(res.data);
    } catch { /* silent */ } finally { setToggling(false); }
  };

  const handleRevealSecret = async () => {
    if (secret) { setShowSecret((v) => !v); return; }
    setSecretLoading(true);
    try {
      const res = await getEndpointSecret(endpoint.id);
      setSecret(res.data.secret);
      setShowSecret(true);
    } catch { /* silent */ } finally { setSecretLoading(false); }
  };

  const handleRotate = async () => {
    if (!confirm("Rotate the signing secret? Existing integrations using the old secret will break.")) return;
    setRotating(true);
    try {
      const res = await rotateEndpointSecret(endpoint.id);
      setSecret(res.data.secret);
      setShowSecret(true);
    } catch { /* silent */ } finally { setRotating(false); }
  };

  const handleLoadDeliveries = async () => {
    if (deliveries) return;
    setDeliveryLoading(true);
    try {
      const res = await listDeliveries(endpoint.id);
      setDeliveries(res.data);
    } catch { setDeliveries([]); } finally { setDeliveryLoading(false); }
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (isExpanded) handleLoadDeliveries();
  }, [isExpanded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-border bg-surface overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div className={`grid place-items-center h-9 w-9 rounded-lg shrink-0 ring-1 ${
          endpoint.isActive
            ? "bg-success/15 ring-success/30 text-success"
            : "bg-muted/50 ring-border text-muted-foreground"
        }`}>
          <Webhook className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a
              href={endpoint.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm truncate hover:underline text-foreground"
            >
              {endpoint.url}
            </a>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {endpoint.eventTypes.map((t) => (
              <span key={t} className="inline-block rounded-full bg-primary/10 text-primary-glow ring-1 ring-primary/20 px-1.5 py-0.5 font-mono text-[10px]">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[10px] text-muted-foreground hidden sm:block">
            {fmtDate(endpoint.createdAt)}
          </span>

          {/* Active toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`h-6 w-10 rounded-full transition-colors relative disabled:opacity-50 ${
              endpoint.isActive ? "bg-success" : "bg-muted"
            }`}
            aria-label={endpoint.isActive ? "Disable endpoint" : "Enable endpoint"}
          >
            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${
              endpoint.isActive ? "translate-x-4" : "translate-x-0"
            }`} />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            aria-label="Delete endpoint"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>

          {/* Expand */}
          <button
            onClick={onToggle}
            className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
            aria-label="Expand details"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-5 space-y-5">
              {/* Signing secret */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Signing secret
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md bg-background ring-1 ring-border px-3 py-2 font-mono text-xs flex items-center gap-2 min-w-0">
                    {secret ? (
                      <span className="truncate">{showSecret ? secret : "•".repeat(40)}</span>
                    ) : (
                      <span className="text-muted-foreground">Click reveal to load secret</span>
                    )}
                  </div>
                  <button
                    onClick={handleRevealSecret}
                    disabled={secretLoading}
                    className="h-8 w-8 grid place-items-center rounded-md ring-1 ring-border bg-background text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-50"
                    aria-label={showSecret ? "Hide secret" : "Reveal secret"}
                  >
                    {secretLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  {secret && (
                    <button
                      onClick={handleCopySecret}
                      className="h-8 w-8 grid place-items-center rounded-md ring-1 ring-border bg-background text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                      aria-label="Copy secret"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={handleRotate}
                    disabled={rotating}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md ring-1 ring-destructive/30 bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    {rotating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Rotate
                  </button>
                </div>
              </div>

              {/* Recent deliveries */}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Recent deliveries
                </p>
                {deliveryLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading deliveries…
                  </div>
                )}
                {!deliveryLoading && deliveries && deliveries.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No deliveries recorded yet.</p>
                )}
                {!deliveryLoading && deliveries && deliveries.length > 0 && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-surface/60">
                          {["Event", "Status", "Code", "Attempted"].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((d) => (
                          <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-surface-elevated/30">
                            <td className="px-3 py-2 font-mono">{d.eventType}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] ring-1 ${
                                d.status === "success"
                                  ? "bg-success/15 text-success ring-success/25"
                                  : d.status === "failed"
                                    ? "bg-destructive/15 text-destructive ring-destructive/25"
                                    : "bg-muted/50 text-muted-foreground ring-border"
                              }`}>
                                {d.status === "success" ? <Check className="h-2.5 w-2.5" /> : d.status === "failed" ? <X className="h-2.5 w-2.5" /> : null}
                                {d.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">{d.statusCode ?? "—"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{fmtDate(d.attemptedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Create Endpoint Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (ep: WebhookEndpoint) => void;
}

function CreateEndpointModal({ open, onOpenChange, onSuccess }: CreateModalProps) {
  const [url, setUrl]               = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    );
  };

  const handleCreate = async () => {
    if (!url.trim() || selectedEvents.length === 0) {
      setError("URL and at least one event type are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createEndpoint({
        url: url.trim(),
        description: description.trim() || undefined,
        eventTypes: selectedEvents,
      });
      onSuccess(res.data);
      setUrl("");
      setDescription("");
      setSelectedEvents([]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create endpoint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <Webhook className="h-5 w-5 text-primary-glow" />
            </div>
            <div>
              <DialogTitle className="font-display text-base font-semibold">Add webhook endpoint</DialogTitle>
              <DialogDescription className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Register a URL to receive event notifications
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="webhook-url" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Endpoint URL *
            </Label>
            <Input
              id="webhook-url"
              placeholder="https://your-app.com/webhooks/Meayar"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-surface-elevated border-border font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="webhook-desc" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Input
              id="webhook-desc"
              placeholder="Production notification handler"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-surface-elevated border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Subscribe to events *
            </Label>
            <div className="grid grid-cols-1 gap-1.5">
              {WEBHOOK_EVENT_TYPES.map((evt) => {
                const selected = selectedEvents.includes(evt);
                return (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvent(evt)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ring-1 ${
                      selected
                        ? "bg-primary/10 ring-primary/30 text-foreground"
                        : "bg-background ring-border text-muted-foreground hover:ring-border-strong hover:text-foreground"
                    }`}
                  >
                    <div className={`grid place-items-center h-4 w-4 rounded shrink-0 ring-1 transition-colors ${
                      selected ? "bg-primary ring-primary/50" : "bg-transparent ring-border"
                    }`}>
                      {selected && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="font-mono text-xs">{evt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                <X className="h-4 w-4 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-border">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="min-w-[140px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register endpoint"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
