// api/_auth.js
// Shared auth helper — parses cookie, refreshes token if needed

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    cookies[k.trim()] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

export async function getAccessToken(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.gauth) return null;

  let tokenData;
  try {
    tokenData = JSON.parse(Buffer.from(cookies.gauth, 'base64').toString('utf-8'));
  } catch {
    return null;
  }

  // Refresh if expired (5 min buffer)
  if (Date.now() > tokenData.expires_at - 300_000) {
    if (!tokenData.refresh_token) return null;

    const refreshRes = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type:    'refresh_token'
      })
    });
    if (!refreshRes.ok) return null;
    const refreshed = await refreshRes.json();
    if (refreshed.error) return null;

    tokenData.access_token = refreshed.access_token;
    tokenData.expires_at   = Date.now() + refreshed.expires_in * 1000;

    const newPayload = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    res.setHeader('Set-Cookie',
      `gauth=${newPayload}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
    );
  }

  return tokenData.access_token;
}

/**
 * Returns the allowed CORS origin.
 * Uses ALLOWED_ORIGIN env var in production; falls back to reflecting the
 * request origin in development so local dev still works.
 */
export function getAllowedOrigin(req) {
  return process.env.ALLOWED_ORIGIN || req.headers.origin || '';
}

/**
 * fetch() wrapper that aborts after timeoutMs (default 8 s).
 * Prevents serverless functions from hanging until platform timeout.
 */
export function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}
