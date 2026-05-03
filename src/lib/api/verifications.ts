import { http } from "./http";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type VerificationStatus = "pending" | "completed" | "failed";

export type VerificationDecision =
  | "approved"
  | "manual_review"
  | "rejected"
  | "human_approved"
  | "human_rejected"
  | "resubmit_requested"
  | null;

export type StepType = "ai_extraction" | "cnas_check";
export type StepStatus = "pending" | "completed" | "failed";

export interface VerificationStep {
  id: string;
  stepType: StepType;
  status: StepStatus;
  confidence: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface VerificationDocument {
  id: string;
  docType: string;
  storagePath: string;
  uploadedAt?: string;
}

export interface Verification {
  id: string;
  doctorId: string;
  tenantId: string;
  status: VerificationStatus;
  score: number | null; // 0.0–1.0
  decision: VerificationDecision;
  startedAt: string;
  completedAt: string | null;
}

export interface VerificationDetail extends Verification {
  steps: VerificationStep[];
  documents: VerificationDocument[];
}

// ─── Paginated wrapper ────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListVerificationsResponse {
  success: boolean;
  data: PaginatedResult<Verification>;
}

export interface SingleVerificationResponse {
  success: boolean;
  data: VerificationDetail;
}

// ─── Reports types ────────────────────────────────────────────────────────────

export type ReportStatus = "pending_review" | "reviewed";
export type ReportDecision = "approved" | "rejected" | "resubmit" | null;

export interface ReportAuthor {
  id: string;
  email: string;
  companyName: string;
}

export interface ReportComment {
  id: string;
  reportId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: ReportAuthor;
}

export interface ReportDoctor {
  id: string;
  fullNameFr: string;
  fullNameAr: string;
  nationalIdNumber: string;
  specialty: string | null;
}

export interface ReportVerification extends VerificationDetail {
  doctor: ReportDoctor;
}

export interface Report {
  id: string;
  verificationId: string;
  contentFormat: string;
  contentRaw: string | null;
  status: ReportStatus;
  decision: ReportDecision;
  decisionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  verification: ReportVerification;
  comments: ReportComment[];
  reviewer: ReportAuthor | null;
  _count: { comments: number };
}

export interface ListReportsResponse {
  success: boolean;
  data: PaginatedResult<Report>;
}

export interface SingleReportResponse {
  success: boolean;
  data: Report;
}

export interface ReportCommentResponse {
  success: boolean;
  data: ReportComment;
}

// ─── Create payloads ──────────────────────────────────────────────────────────

export interface CreateVerificationPayload {
  doctorId: string;
}

export interface SubmitDecisionPayload {
  decision: "approved" | "rejected" | "resubmit";
  note?: string;
}

// ─── SSE event types ──────────────────────────────────────────────────────────

export type SseEventType =
  | "started"
  | "step_started"
  | "step_completed"
  | "step_failed"
  | "completed"
  | "failed";

export interface SseEvent {
  type: SseEventType;
  verificationId: string;
  step?: StepType;
  data?: { confidence?: number; score?: number; decision?: VerificationDecision };
  timestamp: string;
}

// ─── URL helper ───────────────────────────────────────────────────────────────

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const buildUrl = (path: string) => `${BASE_URL}${path}`;

// ─── Verifications API ────────────────────────────────────────────────────────

/** GET /api/verifications — paginated list ordered by startedAt desc */
export async function listVerifications(
  page = 1,
  limit = 20
): Promise<ListVerificationsResponse> {
  return http<ListVerificationsResponse>(
    buildUrl(`/api/verifications?page=${page}&limit=${limit}`),
    { method: "GET" }
  );
}

/** GET /api/verifications/:id — single verification with steps + documents */
export async function getVerification(id: string): Promise<SingleVerificationResponse> {
  return http<SingleVerificationResponse>(buildUrl(`/api/verifications/${id}`), {
    method: "GET",
  });
}

/** POST /api/verifications — start a new verification pipeline */
export async function createVerification(
  payload: CreateVerificationPayload
): Promise<SingleVerificationResponse> {
  return http<SingleVerificationResponse>(buildUrl("/api/verifications"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * GET /api/verifications/:id/stream — SSE real-time progress stream.
 * Returns an EventSource. The bearer token is forwarded as a ?token= query param
 * because EventSource does not support custom request headers natively.
 */
export function streamVerification(id: string): EventSource {
  const token = import.meta.env.VITE_API_TOKEN;
  const url = buildUrl(`/api/verifications/${id}/stream${token ? `?token=${token}` : ""}`);
  return new EventSource(url);
}

// ─── Reports API ──────────────────────────────────────────────────────────────

/** GET /api/reports — paginated review queue */
export async function listReports(
  page = 1,
  limit = 20,
  status?: ReportStatus
): Promise<ListReportsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  return http<ListReportsResponse>(buildUrl(`/api/reports?${params}`), { method: "GET" });
}

/** GET /api/reports/:id — full report detail */
export async function getReport(id: string): Promise<SingleReportResponse> {
  return http<SingleReportResponse>(buildUrl(`/api/reports/${id}`), { method: "GET" });
}

/** GET /api/reports/by-verification/:verificationId — lookup by verification */
export async function getReportByVerification(
  verificationId: string
): Promise<SingleReportResponse> {
  return http<SingleReportResponse>(
    buildUrl(`/api/reports/by-verification/${verificationId}`),
    { method: "GET" }
  );
}

/** POST /api/reports/:id/decision — submit approve / reject / resubmit */
export async function submitDecision(
  reportId: string,
  payload: SubmitDecisionPayload
): Promise<SingleReportResponse> {
  return http<SingleReportResponse>(buildUrl(`/api/reports/${reportId}/decision`), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** POST /api/reports/:id/comments — append a reviewer comment */
export async function addComment(
  reportId: string,
  content: string
): Promise<ReportCommentResponse> {
  return http<ReportCommentResponse>(buildUrl(`/api/reports/${reportId}/comments`), {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
