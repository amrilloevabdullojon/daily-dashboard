// api/tasks/create.js — Create a new Google Task
import { getAccessToken, getAllowedOrigin, fetchWithTimeout } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { text, due, listId } = req.body || {};
  if (!text?.trim()) return res.status(400).json({ error: 'text is required' });

  // Validate due date format if provided
  if (due && isNaN(Date.parse(due))) {
    return res.status(400).json({ error: 'due must be a valid ISO date string' });
  }

  try {
    // If no listId provided, use the first task list
    let targetListId = listId;
    if (!targetListId) {
      const listsRes  = await fetchWithTimeout(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!listsRes.ok) return res.status(listsRes.status).json({ error: 'Failed to fetch task lists' });
      const listsData = await listsRes.json();
      if (!listsData.items || listsData.items.length === 0) {
        return res.status(400).json({ error: 'No task lists found' });
      }
      targetListId = listsData.items[0].id;
    }

    const body = { title: text.trim(), status: 'needsAction' };
    if (due) body.due = new Date(due).toISOString();

    const createRes  = await fetchWithTimeout(
      `https://tasks.googleapis.com/tasks/v1/lists/${targetListId}/tasks`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    const created = await createRes.json();
    if (created.error) return res.status(400).json({ error: created.error.message });

    res.json({
      ok: true,
      task: {
        id:     created.id,
        listId: targetListId,
        text:   created.title,
        done:   false,
        due:    due || '',
        overdue: false,
        list:   '',
        notes:  ''
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
