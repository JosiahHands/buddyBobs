export const baseUrl = 'https://lemmy.world/api/v3/';

// Logged-in requests send the token Lemmy gave us at login
export function authHeaders(jwt?: string | null): Record<string, string> {
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}

// Lemmy reports failures as { error: "some_code" }; throw that code so the UI can explain it
export async function postJson<T>(path: string, body: unknown, jwt?: string | null): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(jwt) },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? `Lemmy request failed: ${response.status}`);
  }
  return data as T;
}
