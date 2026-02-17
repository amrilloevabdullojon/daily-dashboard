// api/tasks/list.js
// Returns Google Tasks from all task lists

import { getAccessToken } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/google' });
  }

  try {
    // Get all task lists
    const listsRes  = await fetch(
      'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const listsData = await listsRes.json();

    if (listsData.error) {
      return res.status(400).json({ error: listsData.error.message });
    }

    const taskLists = listsData.items || [];

    // Fetch tasks from all lists in parallel
    const allTasks = await Promise.all(
      taskLists.map(async list => {
        const tasksRes  = await fetch(
          `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?` +
          new URLSearchParams({
            maxResults:  '20',
            showHidden:  'false',
            showDeleted: 'false'
          }),
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const tasksData = await tasksRes.json();
        return (tasksData.items || []).map(t => ({
          id:       t.id,
          listId:   list.id,
          text:     t.title || '(без названия)',
          done:     t.status === 'completed',
          due:      t.due ? formatDue(t.due) : '',
          overdue:  t.due ? new Date(t.due) < new Date() && t.status !== 'completed' : false,
          list:     list.title,
          notes:    t.notes || ''
        }));
      })
    );

    // Flatten and sort: undone first, then by due date
    const tasks = allTasks
      .flat()
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return 0;
      });

    res.json({ tasks });
  } catch (err) {
    console.error('Tasks API error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

function formatDue(isoDate) {
  const d = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (dDay.getTime() === today.getTime())    return 'сегодня';
  if (dDay.getTime() === tomorrow.getTime()) return 'завтра';

  const diff = Math.round((dDay - today) / 86400000);
  if (diff < 0) return `${Math.abs(diff)} дн. назад`;

  const days = ['вс','пн','вт','ср','чт','пт','сб'];
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}
