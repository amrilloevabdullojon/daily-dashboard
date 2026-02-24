// api/gmail/markread.js — Mark Gmail message as read (remove UNREAD label)
import { getAccessToken } from '../_auth.js';
import { setCorsHeaders } from '../_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { messageId } = req.body || {};
  if (!messageId) return res.status(400).json({ error: 'messageId is required' });

  try {
    const modRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] })
      }
    );

    if (modRes.status === 403) {
      return res.json({ ok: false, reason: 'insufficient_scope', message: 'Need gmail.modify scope' });
    }

    const data = await modRes.json();
    if (data.error) return res.json({ ok: false, error: data.error.message });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
