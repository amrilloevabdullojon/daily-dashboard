// api/auth/me.js
// Returns current user info if authenticated. Refreshes the token if expired.

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    cookies[k.trim()] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.gauth) {
    return res.json({ authenticated: false });
  }

  let tokenData;
  try {
    tokenData = JSON.parse(Buffer.from(cookies.gauth, 'base64').toString('utf-8'));
  } catch {
    return res.json({ authenticated: false });
  }

  // Refresh access token if expired (5 min buffer)
  if (Date.now() > tokenData.expires_at - 300_000) {
    if (!tokenData.refresh_token) {
      return res.json({ authenticated: false });
    }
    try {
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
      if (refreshed.error) {
        return res.json({ authenticated: false });
      }
      tokenData.access_token = refreshed.access_token;
      tokenData.expires_at   = Date.now() + refreshed.expires_in * 1000;

      const newPayload = Buffer.from(JSON.stringify(tokenData)).toString('base64');
      res.setHeader('Set-Cookie',
        `gauth=${newPayload}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
      );
    } catch {
      return res.json({ authenticated: false });
    }
  }

  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    if (user.error) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      name:    user.name,
      email:   user.email,
      picture: user.picture
    });
  } catch {
    res.json({ authenticated: false });
  }
}
