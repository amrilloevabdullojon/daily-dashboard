// api/gmail/messages.js
// Returns list of recent Gmail messages for the authenticated user

async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token'
    })
  });
  return res.json();
}

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
  // CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  // Parse auth cookie
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.gauth) {
    return res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/google' });
  }

  let tokenData;
  try {
    tokenData = JSON.parse(Buffer.from(cookies.gauth, 'base64').toString('utf-8'));
  } catch {
    return res.status(401).json({ error: 'Invalid auth cookie', loginUrl: '/api/auth/google' });
  }

  let accessToken = tokenData.access_token;

  // Refresh token if expired (5 min buffer)
  if (Date.now() > tokenData.expires_at - 300_000) {
    if (!tokenData.refresh_token) {
      return res.status(401).json({ error: 'Token expired, please login again', loginUrl: '/api/auth/google' });
    }
    const refreshed = await refreshAccessToken(tokenData.refresh_token);
    if (refreshed.error) {
      return res.status(401).json({ error: 'Failed to refresh token', loginUrl: '/api/auth/google' });
    }
    accessToken = refreshed.access_token;

    // Update cookie with new token
    const newPayload = Buffer.from(JSON.stringify({
      access_token:  refreshed.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at:    Date.now() + refreshed.expires_in * 1000
    })).toString('base64');
    res.setHeader('Set-Cookie', `gauth=${newPayload}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
  }

  try {
    // Fetch list of message IDs (all mail, max 15)
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();

    if (!listData.messages) {
      return res.json({ messages: [] });
    }

    // Fetch each message in parallel (metadata only — fast)
    const messages = await Promise.all(
      listData.messages.map(async ({ id }) => {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const msg = await msgRes.json();

        const headers = {};
        (msg.payload?.headers || []).forEach(h => {
          headers[h.name] = h.value;
        });

        // Parse "From" header: "Name <email>" or just "email"
        const fromRaw = headers['From'] || '';
        const nameMatch = fromRaw.match(/^"?([^"<]+)"?\s*</);
        const emailMatch = fromRaw.match(/<([^>]+)>/);

        return {
          id,
          from:    nameMatch ? nameMatch[1].trim() : fromRaw,
          email:   emailMatch ? emailMatch[1] : fromRaw,
          subject: headers['Subject'] || '(без темы)',
          date:    headers['Date'] || '',
          snippet: msg.snippet || '',
          unread:  (msg.labelIds || []).includes('UNREAD'),
          starred: (msg.labelIds || []).includes('STARRED')
        };
      })
    );

    res.json({ messages });
  } catch (err) {
    console.error('Gmail API error:', err);
    res.status(500).json({ error: 'Failed to fetch Gmail messages' });
  }
}
