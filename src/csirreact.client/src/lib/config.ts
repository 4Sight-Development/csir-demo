export function getApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase && envBase.trim()) return envBase.trim().replace(/\/+$/, "");
  // Prefer explicit dev backend in development when env is missing
  if (process.env.NODE_ENV === "development") {
    return "https://localhost:7106";
  }
  // In production, default to same-origin if not explicitly configured
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://localhost:7106"; // final fallback
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
