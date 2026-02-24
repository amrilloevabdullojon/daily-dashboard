// api/jira/issues.js
// Proxies requests to Jira Cloud REST API v3
// Credentials are read from the httpOnly drConfig cookie set by /api/config/save

import { formatRelativeTime, parseConfigCookie } from '../_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const cfg    = parseConfigCookie(req.headers.cookie);
  const domain = cfg.jiraDomain || '';
  const email  = cfg.jiraEmail  || '';
  const token  = cfg.jiraToken  || '';

  if (!domain || !email || !token) {
    return res.status(400).json({ error: 'Jira credentials not configured' });
  }

  const basicAuth = Buffer.from(`${email}:${token}`).toString('base64');

  try {
    // JQL: issues where user is assignee OR reporter, ordered by updated
    const jql = '(assignee = currentUser() OR reporter = currentUser()) ORDER BY updated DESC';
    const url  = `https://${domain}/rest/api/3/search/jql`;

    const jiraRes  = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Accept':        'application/json',
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        jql,
        maxResults: 25,
        fields:     ['summary','status','priority','project','updated','assignee','reporter','issuetype']
      })
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
      id:         issue.id,
      key:        issue.key,
      summary:    issue.fields.summary || '(без названия)',
      status:     issue.fields.status?.name       || 'To Do',
      priority:   issue.fields.priority?.name     || 'Medium',
      project:    issue.fields.project?.name      || '',
      projectKey: issue.fields.project?.key       || '',
      assignee:   issue.fields.assignee?.displayName || '',
      reporter:   issue.fields.reporter?.displayName || '',
      type:       issue.fields.issuetype?.name    || 'Task',
      updated:    formatRelativeTime(issue.fields.updated),
      url:        `https://${domain}/browse/${issue.key}`
    }));

    res.json(issues);
  } catch (err) {
    console.error('Jira API error:', err);
    res.status(500).json({ error: 'Failed to fetch Jira issues', message: err.message });
  }
}

