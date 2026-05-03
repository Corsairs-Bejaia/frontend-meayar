import { http } from "./http";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocType =
  | "national_id"
  | "diploma"
  | "affiliation"
  | "agreement"
  | "chifa"
  | "ordonnance"
  | "custom";

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "year"
  | "boolean"
  | "enum"
  | "name_ar"
  | "name_fr";

export interface TemplateField {
  id: string;
  templateId: string;
  fieldName: string;
  fieldLabelFr: string;
  fieldLabelAr: string | null;
  fieldType: FieldType;
  isRequired: boolean;
  validationRegex: string | null;
  sortOrder: number;
}

export interface FieldPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Template {
  id: string;
  userId: string;
  name: string;
  slug: string;
  docType: DocType;
  description: string | null;
  sampleImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  fields: TemplateField[];
  fieldPositions?: Record<string, FieldPosition>;
}

// ─── Request payloads ─────────────────────────────────────────────────────────

export interface CreateTemplateFieldPayload {
  fieldName: string;
  fieldLabelFr: string;
  fieldLabelAr?: string;
  fieldType: FieldType;
  isRequired?: boolean;
  validationRegex?: string;
  sortOrder?: number;
}

export interface CreateTemplatePayload {
  name: string;
  slug: string;
  docType: DocType;
  description?: string;
  fields?: CreateTemplateFieldPayload[];
}

export interface UpdateTemplatePayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateTemplateFieldPayload {
  fieldLabelFr?: string;
  fieldLabelAr?: string;
  fieldType?: FieldType;
  isRequired?: boolean;
  validationRegex?: string;
  sortOrder?: number;
}

export interface SaveFieldPositionsPayload {
  positions: Record<string, FieldPosition>;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ListTemplatesResponse {
  success: boolean;
  data: Template[];
}

export interface SingleTemplateResponse {
  success: boolean;
  data: Template;
}

export interface SingleFieldResponse {
  success: boolean;
  data: TemplateField;
}

// ─── URL helper (mirrors the pattern in apiKeys.ts) ───────────────────────────

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const buildUrl = (path: string) => `${BASE_URL}${path}`;

// ─── API functions ────────────────────────────────────────────────────────────

/** GET /api/templates — list all templates for the authenticated tenant */
export async function listTemplates(): Promise<ListTemplatesResponse> {
  return http<ListTemplatesResponse>(buildUrl("/api/templates"), {
    method: "GET",
  });
}

/** GET /api/templates/:id — get a single template with fields + positions */
export async function getTemplate(id: string): Promise<SingleTemplateResponse> {
  return http<SingleTemplateResponse>(buildUrl(`/api/templates/${id}`), {
    method: "GET",
  });
}

/** POST /api/templates — create a new template (optionally with inline fields) */
export async function createTemplate(
  payload: CreateTemplatePayload
): Promise<SingleTemplateResponse> {
  return http<SingleTemplateResponse>(buildUrl("/api/templates"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/templates/:id — partial update of template metadata */
export async function updateTemplate(
  id: string,
  payload: UpdateTemplatePayload
): Promise<SingleTemplateResponse> {
  return http<SingleTemplateResponse>(buildUrl(`/api/templates/${id}`), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/templates/:id — hard-delete template + all its fields */
export async function deleteTemplate(id: string): Promise<SingleTemplateResponse> {
  return http<SingleTemplateResponse>(buildUrl(`/api/templates/${id}`), {
    method: "DELETE",
  });
}

/** POST /api/templates/:id/fields — append a new field to the template */
export async function addTemplateField(
  templateId: string,
  payload: CreateTemplateFieldPayload
): Promise<SingleFieldResponse> {
  return http<SingleFieldResponse>(buildUrl(`/api/templates/${templateId}/fields`), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/templates/:id/fields/:fieldId — update an existing field */
export async function updateTemplateField(
  templateId: string,
  fieldId: string,
  payload: UpdateTemplateFieldPayload
): Promise<SingleFieldResponse> {
  return http<SingleFieldResponse>(
    buildUrl(`/api/templates/${templateId}/fields/${fieldId}`),
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

/** DELETE /api/templates/:id/fields/:fieldId — remove a field */
export async function removeTemplateField(
  templateId: string,
  fieldId: string
): Promise<SingleFieldResponse> {
  return http<SingleFieldResponse>(
    buildUrl(`/api/templates/${templateId}/fields/${fieldId}`),
    {
      method: "DELETE",
    }
  );
}

/**
 * POST /api/templates/:id/field-positions
 * Save relative bounding boxes { x, y, width, height } (0.0–1.0) for each field.
 */
export async function saveFieldPositions(
  templateId: string,
  payload: SaveFieldPositionsPayload
): Promise<SingleTemplateResponse> {
  return http<SingleTemplateResponse>(
    buildUrl(`/api/templates/${templateId}/field-positions`),
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/**
 * POST /api/templates/:id/sample-image  (multipart/form-data)
 * Upload a representative scan/photo for the document type.
 * NOTE: We do NOT set Content-Type — the browser auto-sets it with the boundary.
 */
export async function uploadSampleImage(
  templateId: string,
  file: File
): Promise<SingleTemplateResponse> {
  const form = new FormData();
  form.append("file", file);

  const API_TOKEN = import.meta.env.VITE_API_TOKEN;
  const headers: HeadersInit = {};
  if (API_TOKEN) {
    headers["Authorization"] = `Bearer ${API_TOKEN}`;
  }

  const res = await fetch(buildUrl(`/api/templates/${templateId}/sample-image`), {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.message ?? "Upload failed");
  }

  return res.json() as Promise<SingleTemplateResponse>;
}
