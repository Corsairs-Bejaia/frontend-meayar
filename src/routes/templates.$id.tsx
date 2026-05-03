import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Pencil, Plus, Upload, Loader2, AlertCircle,
  ImageIcon, Layers, CheckCircle2, X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { TemplateFormModal } from "@/components/template-form-modal";
import { TemplateFieldRow, NewFieldRow } from "@/components/template-field-row";
import {
  getTemplate,
  uploadSampleImage,
  type Template,
  type TemplateField,
  type DocType,
} from "@/lib/api/templates";

export const Route = createFileRoute("/templates/$id")({
  component: TemplateDetailPage,
  head: () => ({ meta: [{ title: "Template — Meayar" }] }),
});

// ─── Doc type labels ──────────────────────────────────────────────────────────

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

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "fields" | "image";

// ─── Main component ───────────────────────────────────────────────────────────

function TemplateDetailPage() {
  const { id } = Route.useParams();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("fields");
  const [editOpen, setEditOpen] = useState(false);
  const [addingField, setAddingField] = useState(false);

  const fetchTemplate = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await getTemplate(id);
      setTemplate(res.data);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const handleFieldAdded = (field: TemplateField) => {
    setTemplate((prev) => prev ? { ...prev, fields: [...prev.fields, field] } : prev);
    setAddingField(false);
  };

  const handleFieldUpdated = (updatedField: TemplateField) => {
    setTemplate((prev) =>
      prev
        ? { ...prev, fields: prev.fields.map((f) => f.id === updatedField.id ? updatedField : f) }
        : prev
    );
  };

  const handleFieldDeleted = (fieldId: string) => {
    setTemplate((prev) =>
      prev ? { ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) } : prev
    );
  };

  const handleEditSuccess = (updated: Template) => {
    setTemplate((prev) => prev ? { ...prev, name: updated.name, description: updated.description } : updated);
    setEditOpen(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell title="Template" subtitle="Loading…">
        <div className="flex flex-col items-center gap-3 mt-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading template…</p>
        </div>
      </AppShell>
    );
  }

  if (fetchError || !template) {
    return (
      <AppShell title="Template" subtitle="Error">
        <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Failed to load template</p>
            <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
          </div>
          <Button variant="outline" onClick={fetchTemplate} className="border-border">Try again</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        title={template.name}
        subtitle={`${DOC_TYPE_LABELS[template.docType]} · ${template.fields.length} field${template.fields.length !== 1 ? "s" : ""}`}
      >
        {/* Back + actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link
            to="/templates"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to templates
          </Link>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium ring-1 ${DOC_TYPE_COLORS[template.docType]}`}>
              {DOC_TYPE_LABELS[template.docType]}
            </span>
            <Button
              id="edit-template-btn"
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 border-border"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit metadata
            </Button>
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-muted-foreground max-w-2xl"
          >
            {template.description}
          </motion.p>
        )}

        {/* Meta row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-muted-foreground">
          <span>Slug: <span className="text-foreground">{template.slug}</span></span>
          <span>Created: <span className="text-foreground">{new Date(template.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></span>
          <span>Updated: <span className="text-foreground">{new Date(template.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span></span>
          {template.sampleImageUrl && (
            <span className="inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sample image uploaded
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex items-center gap-1 border-b border-border">
          {(["fields", "image"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-3 px-4 font-mono text-[11px] uppercase tracking-wider transition-colors ${tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "fields" ? `Fields (${template.fields.length})` : "Sample Image"}
              {tab === t && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-glow rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Fields tab */}
        {tab === "fields" && (
          <motion.div
            key="fields"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div>
                  <h3 className="font-display text-sm font-semibold">Extraction fields</h3>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                    Define which data points to extract from documents
                  </p>
                </div>
                <Button
                  id="add-field-btn"
                  size="sm"
                  onClick={() => setAddingField(true)}
                  disabled={addingField}
                  className="inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add field
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      {["Field name", "Label (FR)", "Label (AR)", "Type", "Required", ""].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {addingField && (
                        <NewFieldRow
                          key="new-field"
                          templateId={template.id}
                          sortOrder={template.fields.length}
                          onAdded={handleFieldAdded}
                          onCancel={() => setAddingField(false)}
                        />
                      )}
                      {template.fields.map((field) => (
                        <TemplateFieldRow
                          key={field.id}
                          templateId={template.id}
                          field={field}
                          onUpdated={handleFieldUpdated}
                          onDeleted={handleFieldDeleted}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {template.fields.length === 0 && !addingField && (
                <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                  <Layers className="h-8 w-8" />
                  <div>
                    <p className="text-sm font-medium">No fields yet</p>
                    <p className="text-xs mt-0.5">Add extraction fields to define what data this template extracts</p>
                  </div>
                  <Button size="sm" onClick={() => setAddingField(true)} className="mt-1 inline-flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Add first field
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Sample image tab */}
        {tab === "image" && (
          <motion.div
            key="image"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <SampleImagePanel template={template} onUpdated={setTemplate} />
          </motion.div>
        )}
      </AppShell>

      <TemplateFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleEditSuccess}
        editTemplate={template}
      />
    </>
  );
}

// ─── Sample image panel ───────────────────────────────────────────────────────

function SampleImagePanel({
  template,
  onUpdated,
}: {
  template: Template;
  onUpdated: (t: Template) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      setUploadError("Only JPEG and PNG files are accepted");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const res = await uploadSampleImage(template.id, file);
      onUpdated(res.data);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border">
        <h3 className="font-display text-sm font-semibold">Sample document image</h3>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
          Upload a representative scan — used by AI to locate field regions (JPEG / PNG)
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 cursor-pointer transition-colors ${dragOver ? "border-primary-glow bg-primary/5" : "border-border hover:border-border-strong hover:bg-surface-elevated/40"}`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Drop image here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">JPEG or PNG · max 20 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Error */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <X className="h-4 w-4 shrink-0" />{uploadError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview */}
        {template.sampleImageUrl && (
          <div className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Current sample image
            </p>
            <div className="relative rounded-xl overflow-hidden border border-border bg-surface-elevated">
              <img
                src={template.sampleImageUrl}
                alt="Sample document"
                className="w-full object-contain max-h-[500px]"
              />
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 ring-1 ring-success/30 px-2.5 py-1 text-[11px] font-mono text-success">
                  <ImageIcon className="h-3 w-3" /> Uploaded
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground break-all font-mono">
              {template.sampleImageUrl}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
