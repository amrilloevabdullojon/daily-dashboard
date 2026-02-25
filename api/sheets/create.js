// api/sheets/create.js
// POST /api/sheets/create
// Body: { spreadsheetId, title, due?, notes? }
// Appends a new task row to the sheet and returns the created task.

import { getAccessToken } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { spreadsheetId, title, due, notes } = req.body || {};
  if (!spreadsheetId || !title?.trim()) {
    return res.status(400).json({ error: 'Missing spreadsheetId or title' });
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  try {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/` +
      `${encodeURIComponent(spreadsheetId)}/values/A:E:append` +
      `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        majorDimension: 'ROWS',
        values: [[id, title.trim(), 'FALSE', due || '', notes || '']],
      }),
    });

    const data = await resp.json();
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    // Extract the actual row index from the updated range (e.g. "Sheet1!A5:E5")
    const updatedRange = data.updates?.updatedRange || '';
    const rowMatch     = updatedRange.match(/:?[A-Z]+(\d+)$/);
    const rowIndex     = rowMatch ? parseInt(rowMatch[1]) : null;

    res.json({
      ok:       true,
      id,
      rowIndex,
      listId:   spreadsheetId,
      title:    title.trim(),
      done:     false,
      due:      due || '',
      notes:    notes || '',
      source:   'sheets',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
