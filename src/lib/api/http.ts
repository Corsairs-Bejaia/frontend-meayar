// lib/http.ts
export class HttpError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string
  ) {
    super(message ?? "HTTP Error")
  }
}

const DEFAULT_TIMEOUT = 10000
const API_TOKEN = import.meta.env.VITE_API_TOKEN

export async function http<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT)

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (options.headers) {
      const extra = options.headers instanceof Headers
        ? Object.fromEntries((options.headers as Headers).entries())
        : Array.isArray(options.headers)
          ? Object.fromEntries(options.headers as [string, string][])
          : options.headers as Record<string, string>;
      Object.assign(headers, extra);
    }

    if (API_TOKEN) {
      headers["Authorization"] = `Bearer ${API_TOKEN}`
    }

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => null)

      throw new HttpError(
        res.status,
        error,
        error?.message
      )
    }

    return await res.json()

  } finally {
    clearTimeout(timeout)
  }
}