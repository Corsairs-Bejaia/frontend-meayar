import { http } from "./http";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocType =
  | "national_id"
  | "diploma"
  | "affiliation"
  | "agreement"
  | "chifa"
  | "ordonnance"
  | "other";

export interface Document {
  id: string;
  verificationId: string;
  docType: DocType;
  storagePath: string;
  templateId: string | null;
  mimeType: string;
  uploadedAt: string;
}

export interface PresignedUrlResponse {
  url: string;
  expiresIn: number; // seconds
}

export interface SingleDocumentResponse {
  success: boolean;
  data: Document;
}

export interface ListDocumentsResponse {
  success: boolean;
  data: Document[];
}

export interface PresignedUrlApiResponse {
  success: boolean;
  data: PresignedUrlResponse;
}

// ─── URL helper ───────────────────────────────────────────────────────────────

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const buildUrl = (path: string) => `${BASE_URL}${path}`;

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * POST /api/documents/upload (multipart/form-data)
 * Accepts JPEG, PNG, or PDF — max 20 MB.
 */
export async function uploadDocument(
  file: File,
  verificationId: string,
  docType: DocType,
  templateId?: string
): Promise<SingleDocumentResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("verificationId", verificationId);
  form.append("docType", docType);
  if (templateId) form.append("templateId", templateId);

  const API_TOKEN = import.meta.env.VITE_API_TOKEN;
  const headers: Record<string, string> = {};
  if (API_TOKEN) headers["Authorization"] = `Bearer ${API_TOKEN}`;

  const res = await fetch(buildUrl("/api/documents/upload"), {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? "Upload failed");
  }

  return res.json() as Promise<SingleDocumentResponse>;
}

/** GET /api/documents/verification/:verificationId — list all docs for a verification */
export async function listDocumentsByVerification(
  verificationId: string
): Promise<ListDocumentsResponse> {
  return http<ListDocumentsResponse>(
    buildUrl(`/api/documents/verification/${verificationId}`),
    { method: "GET" }
  );
}

/** GET /api/documents/:id/url — get a fresh presigned download URL (1h TTL) */
export async function getDocumentUrl(id: string): Promise<PresignedUrlApiResponse> {
  return http<PresignedUrlApiResponse>(buildUrl(`/api/documents/${id}/url`), {
    method: "GET",
  });
}
