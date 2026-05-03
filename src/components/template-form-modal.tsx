import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, X, Loader2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTemplate,
  updateTemplate,
  type Template,
  type DocType,
  type FieldType,
} from "@/lib/api/templates";

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: "national_id", label: "National ID" },
  { value: "diploma", label: "Diploma" },
  { value: "affiliation", label: "Affiliation" },
  { value: "agreement", label: "Agreement" },
  { value: "chifa", label: "Chifa" },
  { value: "ordonnance", label: "Ordonnance" },
  { value: "custom", label: "Custom" },
];

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

const fieldSchema = z.object({
  fieldName: z.string().min(1, "Required"),
  fieldLabelFr: z.string().min(1, "Required"),
  fieldLabelAr: z.string().optional(),
  fieldType: z.enum(["text", "number", "date", "year", "boolean", "enum", "name_ar", "name_fr"] as const).default("text"),
  isRequired: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z.string().min(1, "Required"),
  docType: z.enum(["national_id", "diploma", "affiliation", "agreement", "chifa", "ordonnance", "custom"] as const).default("diploma"),
  description: z.string().optional(),
  fields: z.array(fieldSchema).default([]),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (template: Template) => void;
  editTemplate?: Template | null;
}

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function TemplateFormModal({ open, onOpenChange, onSuccess, editTemplate }: Props) {
  const isEdit = !!editTemplate;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "", docType: "diploma", description: "", fields: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "fields" });
  const name = watch("name");

  useEffect(() => {
    if (!isEdit) setValue("slug", slugify(name));
  }, [name, isEdit, setValue]);

  useEffect(() => {
    if (open && isEdit && editTemplate) {
      reset({
        name: editTemplate.name,
        slug: editTemplate.slug,
        docType: editTemplate.docType,
        description: editTemplate.description ?? "",
        fields: editTemplate.fields.map((f) => ({
          fieldName: f.fieldName,
          fieldLabelFr: f.fieldLabelFr,
          fieldLabelAr: f.fieldLabelAr ?? "",
          fieldType: f.fieldType,
          isRequired: f.isRequired,
          sortOrder: f.sortOrder,
        })),
      });
    } else if (open && !isEdit) {
      reset({ name: "", slug: "", docType: "diploma", description: "", fields: [] });
    }
  }, [open, isEdit, editTemplate, reset]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (isEdit && editTemplate) {
        res = await updateTemplate(editTemplate.id, { name: values.name, description: values.description });
      } else {
        res = await createTemplate({
          name: values.name,
          slug: values.slug,
          docType: values.docType,
          description: values.description,
          fields: values.fields.length > 0 ? values.fields : undefined,
        });
      }
      onSuccess(res.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary/15 ring-1 ring-primary/30">
              <FileText className="h-5 w-5 text-primary-glow" />
            </div>
            <div>
              <DialogTitle className="font-display text-base font-semibold">
                {isEdit ? "Edit template" : "Create template"}
              </DialogTitle>
              <DialogDescription className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {isEdit ? "Update metadata — add fields in the detail view" : "Define a new document extraction template"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form id="template-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Template name *
              </Label>
              <Input id="tpl-name" placeholder="University Diploma" {...register("name")} className="bg-surface-elevated border-border" />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-slug" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Slug *
              </Label>
              <Input id="tpl-slug" placeholder="university-diploma" {...register("slug")} disabled={isEdit} className="bg-surface-elevated border-border font-mono text-sm disabled:opacity-50" />
              {errors.slug && <p className="text-[11px] text-destructive">{errors.slug.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Document type *
              </Label>
              <Select defaultValue={editTemplate?.docType ?? "diploma"} disabled={isEdit} onValueChange={(v) => setValue("docType", v as DocType)}>
                <SelectTrigger id="tpl-doctype" className="bg-surface-elevated border-border disabled:opacity-50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  {DOC_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Description
              </Label>
              <Input id="tpl-desc" placeholder="Short description…" {...register("description")} className="bg-surface-elevated border-border" />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Extraction fields</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => append({ fieldName: "", fieldLabelFr: "", fieldLabelAr: "", fieldType: "text", isRequired: true, sortOrder: fields.length })} className="h-7 text-xs border-border">
                  <Plus className="h-3 w-3 mr-1" /> Add field
                </Button>
              </div>
              <AnimatePresence>
                {fields.map((field, idx) => (
                  <motion.div key={field.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="grid grid-cols-12 gap-2 items-start rounded-lg border border-border/60 bg-surface-elevated/50 p-3">
                    <div className="col-span-3 space-y-1">
                      <Label className="font-mono text-[10px] text-muted-foreground">Field name</Label>
                      <Input placeholder="full_name_fr" {...register(`fields.${idx}.fieldName`)} className="h-8 text-xs bg-surface border-border font-mono" />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="font-mono text-[10px] text-muted-foreground">Label (FR)</Label>
                      <Input placeholder="Nom complet" {...register(`fields.${idx}.fieldLabelFr`)} className="h-8 text-xs bg-surface border-border" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="font-mono text-[10px] text-muted-foreground">Label (AR)</Label>
                      <Input placeholder="الاسم" {...register(`fields.${idx}.fieldLabelAr`)} className="h-8 text-xs bg-surface border-border text-right" dir="rtl" />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="font-mono text-[10px] text-muted-foreground">Type</Label>
                      <Select defaultValue="text" onValueChange={(v) => setValue(`fields.${idx}.fieldType`, v as FieldType)}>
                        <SelectTrigger className="h-8 text-xs bg-surface border-border"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-surface border-border">
                          {FIELD_TYPES.map((ft) => (<SelectItem key={ft.value} value={ft.value} className="text-xs">{ft.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex items-end justify-center pb-0.5 pt-5">
                      <button type="button" onClick={() => remove(idx)} className="h-8 w-8 grid place-items-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" aria-label="Remove field">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {fields.length === 0 && (
                <p className="text-center text-[12px] text-muted-foreground py-3 border border-dashed border-border rounded-lg">
                  No fields yet — add them now or from the template detail page
                </p>
              )}
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <X className="h-4 w-4 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-border">Cancel</Button>
            <Button type="submit" form="template-form" disabled={loading} className="min-w-[120px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save changes" : "Create template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
