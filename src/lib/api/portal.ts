export interface PortalSession {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  decision?: "approved" | "rejected" | "human_approved" | "human_rejected" | "manual_review" | "resubmit_requested" | null;
  score?: number | null;
  signedRedirectUrl?: string | null;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
  };
  documents: {
    id: string;
    docType: string;
    status: string;
  }[];
}

export interface PortalSessionResponse {
  success: boolean;
  data: PortalSession;
}

export interface PortalUploadResponse {
  success: boolean;
  data: {
    id: string;
    docType: string;
    url: string;
  };
}

export interface BulkUploadMetadata {
  docType: string;
  templateId?: string;
}

export interface BulkUploadResponse {
  success: boolean;
  data: {
    uploaded: { id: string; docType: string }[];
    failed: { index: number; error: string }[];
    total: number;
  };
}

export interface PortalSubmitResponse {
  success: boolean;
  message?: string;
}

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://mediverify.up.railway.app";

/**
 * Fetch portal session
 */
export async function getPortalSession(token: string): Promise<PortalSessionResponse> {
  const response = await fetch(`${BASE_URL}/api/portal/session/${token}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to fetch portal session");
  }

  return response.json();
}

/**
 * Upload a document from the portal
 */
export async function uploadPortalDocument(
  token: string,
  file: File,
  docType: string,
  templateId?: string
): Promise<PortalUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("docType", docType);
  if (templateId) {
    formData.append("templateId", templateId);
  }

  const response = await fetch(`${BASE_URL}/api/portal/documents/upload`, {
    method: "POST",
    headers: {
      "X-Session-Token": token,
      "Accept": "application/json",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to upload document");
  }

  return response.json();
}

/**
 * Bulk-upload multiple documents from the portal
 */
export async function bulkUploadPortalDocuments(
  token: string,
  files: File[],
  metadata: BulkUploadMetadata[]
): Promise<BulkUploadResponse> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("metadata", JSON.stringify(metadata));

  const response = await fetch(`${BASE_URL}/api/portal/documents/bulk-upload`, {
    method: "POST",
    headers: {
      "X-Session-Token": token,
      "Accept": "application/json",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to bulk upload documents");
  }

  return response.json();
}

/**
 * Submit the verification for processing
 */
export async function submitPortalVerification(token: string): Promise<PortalSubmitResponse> {
  const response = await fetch(`${BASE_URL}/api/portal/submit`, {
    method: "POST",
    headers: {
      "X-Session-Token": token,
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to submit verification");
  }

  return response.json();
}
