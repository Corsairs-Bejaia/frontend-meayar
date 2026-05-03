import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addTemplateField,
  updateTemplateField,
  removeTemplateField,
  type TemplateField,
  type FieldType,
} from "@/lib/api/templates";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "year", label: "Year" },
  { value: "boolean", label: "Boolean" },
  { value: "enum", label: "Enum" },
  { value: "name_ar", label: "Name (AR)" },
  { value: "name_fr", label: "Name (FR)" },
];

const FIELD_TYPE_COLORS: Record<FieldType, string> = {
  text: "bg-primary/10 text-primary-glow",
  number: "bg-warning/10 text-warning",
  date: "bg-success/10 text-success",
  year: "bg-success/10 text-success",
  boolean: "bg-purple-500/10 text-purple-400",
  enum: "bg-orange-500/10 text-orange-400",
  name_ar: "bg-blue-500/10 text-blue-400",
  name_fr: "bg-indigo-500/10 text-indigo-400",
};

// ─── New Field Row (for adding) ───────────────────────────────────────────────

interface NewFieldRowProps {
  templateId: string;
  sortOrder: number;
  onAdded: (field: TemplateField) => void;
  onCancel: () => void;
}

export function NewFieldRow({ templateId, sortOrder, onAdded, onCancel }: NewFieldRowProps) {
  const [fieldName, setFieldName] = useState("");
  const [fieldLabelFr, setFieldLabelFr] = useState("");
  const [fieldLabelAr, setFieldLabelAr] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [isRequired, setIsRequired] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!fieldName.trim() || !fieldLabelFr.trim()) {
      setError("Field name and French label are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await addTemplateField(templateId, {
        fieldName: fieldName.trim(),
        fieldLabelFr: fieldLabelFr.trim(),
        fieldLabelAr: fieldLabelAr.trim() || undefined,
        fieldType,
        isRequired,
        sortOrder,
      });
      onAdded(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add field");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="border-b border-border/60 bg-primary/5"
    >
      <td className="px-4 py-2">
        <Input
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          placeholder="field_name"
          className="h-7 text-xs font-mono bg-surface border-border w-full"
        />
      </td>
      <td className="px-4 py-2">
        <Input
          value={fieldLabelFr}
          onChange={(e) => setFieldLabelFr(e.target.value)}
          placeholder="Libellé (FR)"
          className="h-7 text-xs bg-surface border-border w-full"
        />
      </td>
      <td className="px-4 py-2">
        <Input
          value={fieldLabelAr}
          onChange={(e) => setFieldLabelAr(e.target.value)}
          placeholder="التسمية"
          dir="rtl"
          className="h-7 text-xs bg-surface border-border w-full text-right"
        />
      </td>
      <td className="px-4 py-2">
        <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
          <SelectTrigger className="h-7 text-xs bg-surface border-border w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface border-border">
            {FIELD_TYPES.map((ft) => (
              <SelectItem key={ft.value} value={ft.value} className="text-xs">{ft.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-2 text-center">
        <button
          type="button"
          onClick={() => setIsRequired(!isRequired)}
          className={`h-6 w-10 rounded-full transition-colors ${isRequired ? "bg-success" : "bg-muted"}`}
          aria-label="Toggle required"
        >
          <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${isRequired ? "translate-x-4" : "translate-x-0"}`} />
        </button>
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {error && <span className="text-[10px] text-destructive mr-1">{error}</span>}
          <Button size="sm" onClick={handleSave} disabled={loading} className="h-7 px-2 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} className="h-7 px-2 text-xs border-border">
            <X className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

// ─── Existing Field Row ───────────────────────────────────────────────────────

interface FieldRowProps {
  templateId: string;
  field: TemplateField;
  onUpdated: (field: TemplateField) => void;
  onDeleted: (fieldId: string) => void;
}

export function TemplateFieldRow({ templateId, field, onUpdated, onDeleted }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [labelFr, setLabelFr] = useState(field.fieldLabelFr);
  const [labelAr, setLabelAr] = useState(field.fieldLabelAr ?? "");
  const [fieldType, setFieldType] = useState<FieldType>(field.fieldType);
  const [isRequired, setIsRequired] = useState(field.isRequired);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await updateTemplateField(templateId, field.id, {
        fieldLabelFr: labelFr,
        fieldLabelAr: labelAr || undefined,
        fieldType,
        isRequired,
      });
      onUpdated(res.data);
      setEditing(false);
    } catch {
      // silently keep editing state on error
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete field "${field.fieldName}"?`)) return;
    setDeleting(true);
    try {
      await removeTemplateField(templateId, field.id);
      onDeleted(field.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setLabelFr(field.fieldLabelFr);
    setLabelAr(field.fieldLabelAr ?? "");
    setFieldType(field.fieldType);
    setIsRequired(field.isRequired);
    setEditing(false);
  };

  return (
    <motion.tr
      layout
      className={`border-b border-border/60 transition-colors ${editing ? "bg-surface-elevated/60" : "hover:bg-surface/40"}`}
    >
      {/* Field name */}
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{field.fieldName}</td>

      {/* Label FR */}
      <td className="px-4 py-3">
        {editing ? (
          <Input value={labelFr} onChange={(e) => setLabelFr(e.target.value)} className="h-7 text-xs bg-surface border-border" />
        ) : (
          <span className="text-sm">{field.fieldLabelFr}</span>
        )}
      </td>

      {/* Label AR */}
      <td className="px-4 py-3">
        {editing ? (
          <Input value={labelAr} onChange={(e) => setLabelAr(e.target.value)} dir="rtl" className="h-7 text-xs bg-surface border-border text-right" placeholder="اختياري" />
        ) : (
          <span className="text-sm text-muted-foreground" dir="rtl">{field.fieldLabelAr ?? "—"}</span>
        )}
      </td>

      {/* Field type */}
      <td className="px-4 py-3">
        {editing ? (
          <Select value={fieldType} onValueChange={(v) => setFieldType(v as FieldType)}>
            <SelectTrigger className="h-7 text-xs bg-surface border-border w-28"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-surface border-border">
              {FIELD_TYPES.map((ft) => (<SelectItem key={ft.value} value={ft.value} className="text-xs">{ft.label}</SelectItem>))}
            </SelectContent>
          </Select>
        ) : (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider ${FIELD_TYPE_COLORS[field.fieldType]}`}>
            {field.fieldType}
          </span>
        )}
      </td>

      {/* Required */}
      <td className="px-4 py-3 text-center">
        {editing ? (
          <button type="button" onClick={() => setIsRequired(!isRequired)} className={`h-6 w-10 rounded-full transition-colors ${isRequired ? "bg-success" : "bg-muted"}`}>
            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5 ${isRequired ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        ) : (
          <span className={`font-mono text-[10px] ${field.isRequired ? "text-success" : "text-muted-foreground"}`}>
            {field.isRequired ? "Yes" : "No"}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={loading} className="h-7 px-2 text-xs">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 px-2 text-xs border-border">
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors" aria-label="Edit field">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleDelete} disabled={deleting} className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50" aria-label="Delete field">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
        </div>
      </td>
    </motion.tr>
  );
}
