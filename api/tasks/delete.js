// api/tasks/delete.js — Delete a Google Task
import { getAccessToken } from '../_auth.js';
import { setCorsHeaders } from '../_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const { taskId, listId } = req.body || {};
  if (!taskId || !listId) {
    return res.status(400).json({ error: 'Missing taskId or listId' });
  }

  try {
    const deleteRes = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks/${taskId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
    );

    // 204 No Content = success
    if (deleteRes.status === 204 || deleteRes.status === 200) {
      return res.json({ ok: true });
    }
    if (deleteRes.status === 404) {
      return res.status(404).json({ ok: false, error: 'Task not found' });
    }
    const data = await deleteRes.json().catch(() => ({}));
    return res.status(400).json({ ok: false, error: data?.error?.message || 'Delete failed' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}
