// api/gmail/messages.js
// Returns list of recent Gmail messages for the authenticated user

import { getAccessToken, getAllowedOrigin, fetchWithTimeout } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/google' });
  }

  try {
    // Fetch list of message IDs (all mail, max 15)
    const listRes = await fetchWithTimeout(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!listRes.ok) {
      return res.status(listRes.status).json({ error: 'Failed to fetch message list' });
    }
    const listData = await listRes.json();

    if (!listData.messages) {
      return res.json({ messages: [] });
    }

    // Fetch each message in parallel (metadata only — fast)
    const messages = await Promise.all(
      listData.messages.map(async ({ id }) => {
        try {
          const msgRes = await fetchWithTimeout(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!msgRes.ok) return null;
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
        } catch {
          return null;
        }
      })
    );

    res.json({ messages: messages.filter(Boolean) });
  } catch (err) {
    console.error('Gmail API error:', err);
    res.status(500).json({ error: 'Failed to fetch Gmail messages' });
  }
}
