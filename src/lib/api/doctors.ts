import { http } from "./http";
import type { PaginatedResult, Verification } from "./verifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DoctorStatus = "active" | "inactive" | "suspended";

export interface Doctor {
  id: string;
  tenantId: string;
  fullNameFr: string;
  fullNameAr: string | null;
  nationalIdNumber: string;
  specialty: string | null;
  status: DoctorStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorWithVerifications extends Doctor {
  verifications: Pick<
    Verification,
    "id" | "status" | "decision" | "score" | "startedAt" | "completedAt"
  >[];
}

export interface ListDoctorsResponse {
  success: boolean;
  data: PaginatedResult<Doctor>;
}

export interface SingleDoctorResponse {
  success: boolean;
  data: DoctorWithVerifications;
}

export interface CreateDoctorPayload {
  fullNameFr: string;
  fullNameAr?: string;
  nationalIdNumber: string;
  specialty?: string;
}

export interface UpdateDoctorPayload {
  fullNameFr?: string;
  fullNameAr?: string;
  nationalIdNumber?: string;
  specialty?: string;
  status?: DoctorStatus;
}

export interface CreateDoctorResponse {
  success: boolean;
  data: Doctor;
}

export interface UpdateDoctorResponse {
  success: boolean;
  data: Doctor;
}

// ─── URL helper ───────────────────────────────────────────────────────────────

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const buildUrl = (path: string) => `${BASE_URL}${path}`;

// ─── API functions ────────────────────────────────────────────────────────────

/** GET /api/doctors — list doctors with pagination and optional filters */
export async function listDoctors(
  page = 1,
  limit = 20,
  status?: DoctorStatus,
  search?: string
): Promise<ListDoctorsResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  return http<ListDoctorsResponse>(buildUrl(`/api/doctors?${params}`), { method: "GET" });
}

/** GET /api/doctors/:id — single doctor with recent verifications */
export async function getDoctor(id: string): Promise<SingleDoctorResponse> {
  return http<SingleDoctorResponse>(buildUrl(`/api/doctors/${id}`), { method: "GET" });
}

/** POST /api/doctors — create a new doctor */
export async function createDoctor(payload: CreateDoctorPayload): Promise<CreateDoctorResponse> {
  return http<CreateDoctorResponse>(buildUrl("/api/doctors"), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PUT /api/doctors/:id — update an existing doctor */
export async function updateDoctor(
  id: string,
  payload: UpdateDoctorPayload
): Promise<UpdateDoctorResponse> {
  return http<UpdateDoctorResponse>(buildUrl(`/api/doctors/${id}`), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
