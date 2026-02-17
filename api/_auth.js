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

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: tokenData.refresh_token,
        grant_type:    'refresh_token'
      })
    });
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
