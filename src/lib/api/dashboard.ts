import { http } from "./http";
import type { PaginatedResult } from "./verifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  doctors: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  };
  verifications: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  apiKeys: {
    total: number;
    active: number;
  };
  recentActivity: {
    id: string;
    verificationId: string;
    action: string;
    actor: string;
    createdAt: string;
  }[];
}

export interface StatsResponse {
  success: boolean;
  data: DashboardStats;
}

export interface AuditLog {
  id: string;
  verificationId: string;
  action: string;
  actor: string;
  detailsJson: Record<string, any>;
  createdAt: string;
}

export interface ActivityResponse {
  success: boolean;
  data: PaginatedResult<AuditLog>;
}

export interface ChartDataPoint {
  date: string;
  total: number;
  approved: number;
  manual_review: number;
  rejected: number;
}

export interface ChartResponse {
  success: boolean;
  data: ChartDataPoint[];
}

// ─── URL helper ───────────────────────────────────────────────────────────────

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const buildUrl = (path: string) => `${BASE_URL}${path}`;

// ─── API functions ────────────────────────────────────────────────────────────

/** GET /api/dashboard/stats — high-level KPI counts */
export async function getDashboardStats(): Promise<StatsResponse> {
  return http<StatsResponse>(buildUrl("/api/dashboard/stats"), { method: "GET" });
}

/** GET /api/dashboard/activity — paginated audit log */
export async function getDashboardActivity(page = 1, limit = 20): Promise<ActivityResponse> {
  return http<ActivityResponse>(buildUrl(`/api/dashboard/activity?page=${page}&limit=${limit}`), {
    method: "GET",
  });
}

/** GET /api/dashboard/chart — daily counts for the last 30 days */
export async function getDashboardChart(): Promise<ChartResponse> {
  return http<ChartResponse>(buildUrl("/api/dashboard/chart"), { method: "GET" });
}
