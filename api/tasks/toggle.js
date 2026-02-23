// api/tasks/toggle.js
// Toggles a Google Task completed/needsAction status
// Requires tasks scope (not readonly) — if not available, returns soft error

import { getAccessToken, getAllowedOrigin, fetchWithTimeout } from '../_auth.js';

const VALID_STATUSES = ['completed', 'needsAction'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { taskId, listId, status } = req.body || {};
  if (!taskId || !status) {
    return res.status(400).json({ error: 'Missing taskId or status' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  // If no listId — find task across all lists
  async function findListForTask(token, tid) {
    const listsRes  = await fetchWithTimeout(
      'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!listsRes.ok) return null;
    const listsData = await listsRes.json();
    const lists     = listsData.items || [];

    for (const list of lists) {
      const tasksRes  = await fetchWithTimeout(
        `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showHidden=true&maxResults=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!tasksRes.ok) continue;
      const tasksData = await tasksRes.json();
      if ((tasksData.items || []).some(t => t.id === tid)) {
        return list.id;
      }
    }
    return null;
  }

  try {
    const resolvedListId = listId || await findListForTask(accessToken, taskId);
    if (!resolvedListId) {
      return res.status(404).json({ error: 'Task not found in any list', ok: false });
    }

    const patchRes = await fetchWithTimeout(
      `https://tasks.googleapis.com/tasks/v1/lists/${resolvedListId}/tasks/${taskId}`,
      {
        method:  'PATCH',
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, completed: status === 'completed' ? new Date().toISOString() : null })
      }
    );

    if (patchRes.status === 403) {
      // Readonly scope — graceful degradation
      return res.json({ ok: false, reason: 'readonly_scope', message: 'Need tasks scope (not readonly)' });
    }

    const patchData = await patchRes.json();
    if (patchData.error) {
      return res.json({ ok: false, reason: patchData.error.message });
    }

    res.json({ ok: true, status: patchData.status });
  } catch (err) {
    res.status(500).json({ error: err.message, ok: false });
  }
}
