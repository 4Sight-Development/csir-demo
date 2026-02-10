export type AuthTokens = {
  accessToken: string;
  expiresAt: number; // epoch ms
  refreshToken?: string;
};

const KEY = "auth_tokens";

export function setAuthTokens(t: AuthTokens) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {}
}

export function getAuthTokens(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthTokens;
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  const t = getAuthTokens();
  if (!t) return null;
  const now = Date.now();
  if (t.expiresAt && now > t.expiresAt) return null;
  return t.accessToken;
}
