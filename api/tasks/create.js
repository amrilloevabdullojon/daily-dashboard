// api/tasks/create.js — Create a new Google Task
import { getAccessToken } from '../_auth.js';
import { setCorsHeaders } from '../_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { title, due, listId } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });

  try {
    // If no listId provided, use the first task list
    let targetListId = listId;
    if (!targetListId) {
      const listsRes  = await fetch(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const listsData = await listsRes.json();
      if (!listsData.items || listsData.items.length === 0) {
        return res.status(400).json({ error: 'No task lists found' });
      }
      targetListId = listsData.items[0].id;
    }

    const body = { title: title.trim(), status: 'needsAction' };
    if (due) body.due = new Date(due).toISOString();

    const createRes  = await fetch(
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
      id:     created.id,
      listId: targetListId,
      title:  created.title,
      done:   false,
      due:    due || '',
      notes:  ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
