// api/sheets/toggle.js
// POST /api/sheets/toggle
// Body: { spreadsheetId, rowIndex, done }
// Updates column C (done) of the specified sheet row.

import { getAccessToken } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { spreadsheetId, rowIndex, done } = req.body || {};
  if (!spreadsheetId || !rowIndex) {
    return res.status(400).json({ error: 'Missing spreadsheetId or rowIndex' });
  }

  try {
    const range = `C${rowIndex}`;
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/` +
      `${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=RAW`;

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [[done ? 'TRUE' : 'FALSE']],
      }),
    });

    const data = await resp.json();
    if (data.error) {
      return res.status(400).json({ ok: false, error: data.error.message });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
