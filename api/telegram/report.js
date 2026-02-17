// api/telegram/report.js
// Sends a daily digest report to Telegram

import { getAccessToken } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { tgToken, tgChatId, jiraDomain, jiraEmail, jiraToken } = req.body || {};

  if (!tgToken || !tgChatId) {
    return res.status(400).json({ error: 'Missing Telegram credentials' });
  }

  const accessToken = await getAccessToken(req, res);

  // Collect data in parallel
  const [calData, tasksData, jiraData, gmailData] = await Promise.allSettled([
    // Calendar events today
    accessToken
      ? fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?` + new URLSearchParams({
          timeMin:      new Date(new Date().setHours(0,0,0,0)).toISOString(),
          timeMax:      new Date(new Date().setHours(23,59,59,0)).toISOString(),
          singleEvents: 'true',
          orderBy:      'startTime',
          maxResults:   '10'
        }), { headers: { Authorization: `Bearer ${accessToken}` } }).then(r=>r.json())
      : Promise.resolve(null),

    // Google Tasks
    accessToken
      ? fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=5',
          { headers: { Authorization: `Bearer ${accessToken}` } })
          .then(r=>r.json())
          .then(async lists => {
            if (!lists.items) return [];
            const all = await Promise.all(lists.items.map(l =>
              fetch(`https://tasks.googleapis.com/tasks/v1/lists/${l.id}/tasks?maxResults=10&showHidden=false`,
                { headers: { Authorization: `Bearer ${accessToken}` } }).then(r=>r.json())
            ));
            return all.flatMap(d => d.items || []);
          })
      : Promise.resolve([]),

    // Jira issues
    (jiraDomain && jiraEmail && jiraToken)
      ? fetch(`https://${jiraDomain}/rest/api/3/search/jql`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`,
            'Content-Type': 'application/json', 'Accept': 'application/json'
          },
          body: JSON.stringify({
            jql: '(assignee = currentUser() OR reporter = currentUser()) AND updated >= -1d ORDER BY updated DESC',
            maxResults: 10,
            fields: ['summary','status','priority','updated']
          })
        }).then(r=>r.json())
      : Promise.resolve(null),

    // Gmail unread count
    accessToken
      ? fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&labelIds=UNREAD',
          { headers: { Authorization: `Bearer ${accessToken}` } }).then(r=>r.json())
      : Promise.resolve(null)
  ]);

  // ── Build message ──────────────────────────────────────
  const now    = new Date();
  const days   = ['вс','пн','вт','ср','чт','пт','сб'];
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  let msg = `📊 *Дневной отчёт* — ${dateStr}\n\n`;

  // Calendar
  const events = calData.value?.items || [];
  if (events.length > 0) {
    msg += `📅 *Встречи сегодня* (${events.length})\n`;
    events.forEach(ev => {
      const start = ev.start?.dateTime
        ? new Date(ev.start.dateTime).toLocaleTimeString('ru', {hour:'2-digit',minute:'2-digit'})
        : 'весь день';
      msg += `  • ${start} — ${ev.summary || '(без названия)'}\n`;
    });
    msg += '\n';
  } else {
    msg += `📅 *Встречи:* нет\n\n`;
  }

  // Tasks
  const tasks = Array.isArray(tasksData.value) ? tasksData.value : [];
  const pending  = tasks.filter(t => t.status !== 'completed');
  const done     = tasks.filter(t => t.status === 'completed');
  if (tasks.length > 0) {
    msg += `✅ *Задачи* (${done.length}/${tasks.length} выполнено)\n`;
    pending.slice(0,5).forEach(t => {
      const due = t.due ? ` _(${new Date(t.due).toLocaleDateString('ru')})_` : '';
      msg += `  ⬜ ${t.title}${due}\n`;
    });
    if (done.length > 0) msg += `  _...и ${done.length} выполнено_\n`;
    msg += '\n';
  }

  // Jira
  const jiraIssues = jiraData.value?.issues || [];
  if (jiraIssues.length > 0) {
    msg += `🔧 *Jira задачи* (${jiraIssues.length})\n`;
    jiraIssues.slice(0,5).forEach(issue => {
      const status = issue.fields?.status?.name || '';
      const emoji  = status.toLowerCase().includes('progress') ? '🔵'
                   : status.toLowerCase().includes('review')   ? '🟣'
                   : status.toLowerCase().includes('done')     ? '✅' : '⬜';
      msg += `  ${emoji} [${issue.key}](https://${jiraDomain}/browse/${issue.key}) ${issue.fields?.summary || ''}\n`;
    });
    msg += '\n';
  }

  // Gmail
  const unreadCount = gmailData.value?.resultSizeEstimate || 0;
  if (unreadCount > 0) {
    msg += `📬 *Gmail:* ${unreadCount} непрочитанных\n\n`;
  }

  msg += `_Отчёт сгенерирован в ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}_`;

  // ── Send to Telegram ───────────────────────────────────
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:    tgChatId,
        text:       msg,
        parse_mode: 'Markdown'
      })
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return res.status(400).json({ error: tgData.description });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
