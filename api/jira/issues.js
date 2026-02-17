// api/jira/issues.js
// Proxies requests to Jira Cloud REST API v3
// Credentials come from frontend via request headers (never stored server-side)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-jira-domain, x-jira-email, x-jira-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const domain = req.headers['x-jira-domain'];
  const email  = req.headers['x-jira-email'];
  const token  = req.headers['x-jira-token'];

  if (!domain || !email || !token) {
    return res.status(400).json({ error: 'Missing Jira credentials in headers' });
  }

  const basicAuth = Buffer.from(`${email}:${token}`).toString('base64');

  try {
    // JQL: issues assigned to current user, ordered by updated
    const jql = 'assignee = currentUser() ORDER BY updated DESC';
    const url  = `https://${domain}/rest/api/3/search?` + new URLSearchParams({
      jql,
      maxResults: '25',
      fields:     'summary,status,priority,project,updated,assignee'
    });

    const jiraRes  = await fetch(url, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept':        'application/json'
      }
    });

    const jiraData = await jiraRes.json();

    if (jiraData.errorMessages?.length || jiraData.errors) {
      return res.status(400).json({
        error: jiraData.errorMessages?.[0] || JSON.stringify(jiraData.errors)
      });
    }

    if (!jiraData.issues) {
      return res.status(jiraRes.status).json({ error: 'Unexpected Jira response', raw: jiraData });
    }

    const issues = jiraData.issues.map(issue => ({
      key:      issue.key,
      summary:  issue.fields.summary || '(без названия)',
      status:   issue.fields.status?.name   || 'To Do',
      priority: issue.fields.priority?.name || 'Medium',
      project:  issue.fields.project?.name  || '',
      updated:  formatUpdated(issue.fields.updated),
      url:      `https://${domain}/browse/${issue.key}`
    }));

    res.json({ issues, total: jiraData.total });
  } catch (err) {
    console.error('Jira API error:', err);
    res.status(500).json({ error: 'Failed to fetch Jira issues', message: err.message });
  }
}

function formatUpdated(isoDate) {
  if (!isoDate) return '';
  const d    = new Date(isoDate);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000); // seconds

  if (diff < 60)           return 'только что';
  if (diff < 3600)         return Math.floor(diff / 60) + ' мин назад';
  if (diff < 86400)        return Math.floor(diff / 3600) + ' ч назад';
  if (diff < 86400 * 2)    return 'вчера';
  if (diff < 86400 * 7)    return Math.floor(diff / 86400) + ' дн. назад';

  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
