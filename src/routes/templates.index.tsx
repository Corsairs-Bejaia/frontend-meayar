import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, FileText, Layers, Calendar, Trash2,
  ChevronRight, Loader2, AlertCircle, LayoutGrid,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TemplateFormModal } from "@/components/template-form-modal";
import {
  listTemplates,
  deleteTemplate,
  type Template,
  type DocType,
} from "@/lib/api/templates";

export const Route = createFileRoute("/templates/")({
  component: TemplatesPage,
  head: () => ({ meta: [{ title: "Templates — Meayar" }] }),
});

// ─── Doc type display helpers ─────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocType, string> = {
  national_id: "National ID",
  diploma: "Diploma",
  affiliation: "Affiliation",
  agreement: "Agreement",
  chifa: "Chifa",
  ordonnance: "Ordonnance",
  custom: "Custom",
};

const DOC_TYPE_COLORS: Record<DocType, string> = {
  national_id: "bg-blue-500/15 text-blue-400 ring-blue-500/25",
  diploma: "bg-primary/15 text-primary-glow ring-primary/25",
  affiliation: "bg-success/15 text-success ring-success/25",
  agreement: "bg-warning/15 text-warning ring-warning/25",
  chifa: "bg-purple-500/15 text-purple-400 ring-purple-500/25",
  ordonnance: "bg-orange-500/15 text-orange-400 ring-orange-500/25",
  custom: "bg-muted/50 text-muted-foreground ring-border",
};

// ─── Main component ───────────────────────────────────────────────────────────

function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<DocType | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await listTemplates();
      setTemplates(res.data);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch =
        search === "" ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase());
      const matchType = docTypeFilter === "all" || t.docType === docTypeFilter;
      return matchSearch && matchType;
    });
  }, [templates, search, docTypeFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}" and all its fields? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete template");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreated = (template: Template) => {
    setTemplates((prev) => [template, ...prev]);
    setCreateOpen(false);
  };

  return (
    <>
      <AppShell title="Templates" subtitle="Manage document extraction templates for your tenant">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="template-search"
                placeholder="Search templates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-surface-elevated border-border h-9"
              />
            </div>
            <Select value={docTypeFilter} onValueChange={(v) => setDocTypeFilter(v as DocType | "all")}>
              <SelectTrigger id="template-doctype-filter" className="w-36 h-9 bg-surface-elevated border-border">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border">
                <SelectItem value="all">All types</SelectItem>
                {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map((dt) => (
                  <SelectItem key={dt} value={dt}>{DOC_TYPE_LABELS[dt]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button id="create-template-btn" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 shrink-0">
            <Plus className="h-4 w-4" /> New template
          </Button>
        </div>

        {/* Stats bar */}
        {!loading && !fetchError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-6 rounded-xl border border-border bg-surface px-5 py-3"
          >
            <Stat label="Total templates" value={templates.length} />
            <div className="h-8 w-px bg-border" />
            <Stat label="Showing" value={filtered.length} />
            <div className="h-8 w-px bg-border" />
            <Stat label="Total fields" value={templates.reduce((acc, t) => acc + t.fields.length, 0)} />
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Loading templates…</p>
          </div>
        )}

        {/* Error */}
        {fetchError && !loading && (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Failed to load templates</p>
              <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
            </div>
            <Button variant="outline" onClick={fetchTemplates} className="border-border">Try again</Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !fetchError && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 flex flex-col items-center gap-4 text-center"
          >
            <div className="grid place-items-center h-16 w-16 rounded-2xl bg-surface border border-border">
              {templates.length === 0 ? (
                <FileText className="h-7 w-7 text-muted-foreground" />
              ) : (
                <LayoutGrid className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-display text-base font-semibold">
                {templates.length === 0 ? "No templates yet" : "No templates match your filters"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {templates.length === 0
                  ? "Create your first document extraction template to get started"
                  : "Try adjusting your search or filter criteria"}
              </p>
            </div>
            {templates.length === 0 && (
              <Button onClick={() => setCreateOpen(true)} className="mt-2 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create template
              </Button>
            )}
          </motion.div>
        )}

        {/* Template grid */}
        {!loading && !fetchError && filtered.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((template, i) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative rounded-xl border border-border bg-surface p-5 hover:border-border-strong transition-all hover:shadow-md hover:shadow-black/10"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid place-items-center h-10 w-10 shrink-0 rounded-lg bg-surface-elevated ring-1 ring-border">
                        <FileText className="h-4.5 w-4.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display text-[15px] font-semibold truncate">{template.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground truncate">{template.slug}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ring-1 ${DOC_TYPE_COLORS[template.docType]}`}>
                      {DOC_TYPE_LABELS[template.docType]}
                    </span>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                  )}

                  {/* Meta */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      {template.fields.length} field{template.fields.length !== 1 ? "s" : ""}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(template.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                    <Link
                      to="/templates/$id"
                      params={{ id: template.id }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-glow hover:underline"
                    >
                      Open <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      disabled={deletingId === template.id}
                      className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      aria-label={`Delete ${template.name}`}
                    >
                      {deletingId === template.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </AppShell>

      <TemplateFormModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleCreated}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold tabular-nums mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}
