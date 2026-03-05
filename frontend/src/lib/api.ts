const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const res = await fetch("/api/token");
  if (!res.ok) throw new Error("Not authenticated");
  const { token } = await res.json();

  cachedToken = token;
  tokenExpiresAt = Date.now() + 50 * 60 * 1000; // refresh 10min before expiry
  return token;
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getToken();
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}

export interface Conversion {
  id: string;
  original_filename: string;
  status: "processing" | "completed" | "failed";
  file_size_bytes: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DownloadResponse {
  url: string;
  filename: string;
}

export async function fetchConversions(): Promise<Conversion[]> {
  const res = await authFetch("/api/conversions");
  if (!res.ok) throw new Error("Failed to fetch conversions");
  return res.json();
}

export async function uploadPdf(file: File): Promise<Conversion> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BACKEND_URL}/api/conversions/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function getDownloadUrl(
  conversionId: string,
  fileType: "pdf" | "docx"
): Promise<DownloadResponse> {
  const res = await authFetch(
    `/api/conversions/${conversionId}/download/${fileType}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to get download URL" }));
    throw new Error(err.detail || "Failed to get download URL");
  }
  return res.json();
}
