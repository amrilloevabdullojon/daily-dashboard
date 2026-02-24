// api/gmail/messages.js
// Returns list of recent Gmail messages for the authenticated user

import { getAccessToken } from '../_auth.js';
import { setCorsHeaders }  from '../_utils.js';

const AVATAR_COLORS = ['#3b82f6','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];

function emailToColor(email) {
  let hash = 0;
  for (const ch of (email || '')) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/google' });
  }

  try {
    // Fetch list of message IDs (all mail, max 15)
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();

    if (!listData.messages) {
      return res.json([]);
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
        const fromRaw    = headers['From'] || '';
        const nameMatch  = fromRaw.match(/^"?([^"<]+)"?\s*</);
        const emailMatch = fromRaw.match(/<([^>]+)>/);
        const emailAddr  = emailMatch ? emailMatch[1] : fromRaw;

        return {
          id,
          from:        nameMatch ? nameMatch[1].trim() : fromRaw,
          email:       emailAddr,
          subject:     headers['Subject'] || '(без темы)',
          date:        headers['Date'] || '',
          snippet:     msg.snippet || '',
          unread:      (msg.labelIds || []).includes('UNREAD'),
          starred:     (msg.labelIds || []).includes('STARRED'),
          avatarColor: emailToColor(emailAddr),
        };
      })
    );

    res.json(messages);
  } catch (err) {
    console.error('Gmail API error:', err);
    res.status(500).json({ error: 'Failed to fetch Gmail messages' });
  }
}
