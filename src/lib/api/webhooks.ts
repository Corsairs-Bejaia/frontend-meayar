import { http } from "./http";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  eventTypes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSecret {
  secret: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  status: "success" | "failed" | "pending";
  statusCode: number | null;
  attemptedAt: string;
  responseBody: string | null;
}

export interface ListEndpointsResponse {
  success: boolean;
  data: WebhookEndpoint[];
}

export interface SingleEndpointResponse {
  success: boolean;
  data: WebhookEndpoint;
}

export interface SecretResponse {
  success: boolean;
  data: WebhookSecret;
}

export interface DeliveriesResponse {
  success: boolean;
  data: WebhookDelivery[];
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateEndpointPayload {
  url: string;
  description?: string;
  eventTypes: string[];
}

export interface UpdateEndpointPayload {
  url?: string;
  description?: string;
  eventTypes?: string[];
  isActive?: boolean;
}

// ─── Available event types (from Svix / backend conventions) ─────────────────

export const WEBHOOK_EVENT_TYPES = [
  "verification.completed",
  "verification.failed",
  "verification.manual_review",
  "report.decision_submitted",
  "document.uploaded",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

// ─── URL helper ───────────────────────────────────────────────────────────────

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const buildUrl = (path: string) => `${BASE_URL}${path}`;

// ─── API functions ────────────────────────────────────────────────────────────

/** GET /api/webhooks/endpoints — list all registered endpoints */
export async function listEndpoints(): Promise<ListEndpointsResponse> {
  return http<ListEndpointsResponse>(buildUrl("/api/webhooks/endpoints"), { method: "GET" });
}

/** GET /api/webhooks/endpoints/:id — get a single endpoint */
export async function getEndpoint(id: string): Promise<SingleEndpointResponse> {
  return http<SingleEndpointResponse>(buildUrl(`/api/webhooks/endpoints/${id}`), { method: "GET" });
}

/** POST /api/webhooks/endpoints — register a new webhook endpoint */
export async function createEndpoint(payload: CreateEndpointPayload): Promise<SingleEndpointResponse> {
  return http<SingleEndpointResponse>(buildUrl("/api/webhooks/endpoints"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/webhooks/endpoints/:id — update an endpoint */
export async function updateEndpoint(
  id: string,
  payload: UpdateEndpointPayload
): Promise<SingleEndpointResponse> {
  return http<SingleEndpointResponse>(buildUrl(`/api/webhooks/endpoints/${id}`), {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/webhooks/endpoints/:id — delete an endpoint */
export async function deleteEndpoint(id: string): Promise<void> {
  return http<void>(buildUrl(`/api/webhooks/endpoints/${id}`), { method: "DELETE" });
}

/** GET /api/webhooks/endpoints/:id/secret — get the Svix signing secret */
export async function getEndpointSecret(id: string): Promise<SecretResponse> {
  return http<SecretResponse>(buildUrl(`/api/webhooks/endpoints/${id}/secret`), { method: "GET" });
}

/** POST /api/webhooks/endpoints/:id/rotate-secret — rotate signing secret */
export async function rotateEndpointSecret(id: string): Promise<SecretResponse> {
  return http<SecretResponse>(buildUrl(`/api/webhooks/endpoints/${id}/rotate-secret`), { method: "POST" });
}

/** GET /api/webhooks/endpoints/:id/deliveries — list recent delivery attempts */
export async function listDeliveries(id: string): Promise<DeliveriesResponse> {
  return http<DeliveriesResponse>(buildUrl(`/api/webhooks/endpoints/${id}/deliveries`), { method: "GET" });
}
