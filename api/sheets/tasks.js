// api/sheets/tasks.js
// GET /api/sheets/tasks?spreadsheetId=xxx
// Reads tasks from Google Sheets.
// Expected sheet format (row 1 = header):
//   A: id | B: title | C: done (TRUE/FALSE) | D: due | E: notes

import { getAccessToken } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { spreadsheetId } = req.query;
  if (!spreadsheetId) {
    return res.status(400).json({ error: 'Missing spreadsheetId' });
  }

  try {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/` +
      `${encodeURIComponent(spreadsheetId)}/values/A1:E1000`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await resp.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const rows = data.values || [];
    // Row 0 = header → skip; data starts at row 1 (sheet row 2)
    const tasks = rows
      .slice(1)
      .map((row, i) => ({
        id:       row[0] || String(i + 2),
        rowIndex: i + 2,               // 1-based sheet row number
        listId:   spreadsheetId,
        title:    row[1] || '',
        done:     (row[2] || '').toUpperCase() === 'TRUE',
        due:      row[3] || '',
        notes:    row[4] || '',
        source:   'sheets',
      }))
      .filter(t => t.title.trim());

    res.json(tasks);
  } catch (err) {
    console.error('Sheets tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch sheet tasks' });
  }
}
