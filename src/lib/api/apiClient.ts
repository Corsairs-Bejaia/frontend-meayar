// lib/apiClient.ts
import { ZodSchema } from "zod"
import { http } from "./http"

export interface ApiClientOptions<T> {
  schema?: ZodSchema<T>
  mapResponse?: (data: any) => T
}

export async function apiClient<T>(
  url: string,
  options: RequestInit,
  config: ApiClientOptions<T> = {}
): Promise<T> {

  const raw = await http<any>(url, options)

  let extracted = config.mapResponse
    ? config.mapResponse(raw)
    : raw

  if (config.schema) {
    const parsed = config.schema.parse(extracted)
    return parsed
  }

  return extracted
}