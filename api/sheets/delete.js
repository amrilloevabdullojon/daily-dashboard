// api/sheets/delete.js — Delete a row from Google Sheets task list
// POST /api/sheets/delete
// Body: { spreadsheetId, rowIndex }
// Uses batchUpdate deleteDimension to remove the row entirely.

import { getAccessToken } from '../_auth.js';
import { setCorsHeaders } from '../_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { spreadsheetId, rowIndex } = req.body || {};
  if (!spreadsheetId || !rowIndex) {
    return res.status(400).json({ error: 'Missing spreadsheetId or rowIndex' });
  }

  // rowIndex is 1-based (sheet row number); Sheets API uses 0-based startIndex
  const zeroBasedRow = Number(rowIndex) - 1;
  if (isNaN(zeroBasedRow) || zeroBasedRow < 1) {
    return res.status(400).json({ error: 'Invalid rowIndex (cannot delete header row)' });
  }

  try {
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/` +
      `${encodeURIComponent(spreadsheetId)}:batchUpdate`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId:    0, // first sheet
              dimension:  'ROWS',
              startIndex: zeroBasedRow,
              endIndex:   zeroBasedRow + 1,
            }
          }
        }]
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
