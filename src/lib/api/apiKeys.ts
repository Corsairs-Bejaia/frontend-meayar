import { apiClient } from "./apiClient"
import { http } from "./http"

export interface ApiKeyPermission {
  [key: string]: string
}

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  rateLimit: number
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
}

export interface CreateApiKeyResponse {
  success: boolean
  data: ApiKey & { rawKey: string }
}

export interface ListApiKeysResponse {
  success: boolean
  data: ApiKey[]
}

export interface DeleteApiKeyResponse {
  success: boolean
  data: {
    id: string
    isActive: boolean
  }
}

export interface CreateApiKeyPayload {
  name: string
  permissions: string[]
  rateLimit: number
}

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}`;
const buildUrl = (path: string) => `${BASE_URL}${path}`;

export async function createApiKey(
  payload: CreateApiKeyPayload
): Promise<CreateApiKeyResponse> {
  return http<CreateApiKeyResponse>(buildUrl("/api/api-keys"), {
    
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function listApiKeys(): Promise<ListApiKeysResponse> {
  return http<ListApiKeysResponse>(buildUrl("/api/api-keys"), {
    method: "GET",
  })
}

export async function deleteApiKey(id: string): Promise<DeleteApiKeyResponse> {
  return http<DeleteApiKeyResponse>(buildUrl(`/api/api-keys/${id}`), {
    method: "DELETE",
  })
}
