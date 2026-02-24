// api/jira/create.js — Create a new Jira issue
// Credentials are read from the httpOnly drConfig cookie set by /api/config/save

import { parseConfigCookie } from '../_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const cfg    = parseConfigCookie(req.headers.cookie);
  const domain = cfg.jiraDomain || '';
  const email  = cfg.jiraEmail  || '';
  const token  = cfg.jiraToken  || '';
  if (!domain || !email || !token) {
    return res.status(400).json({ error: 'Jira credentials not configured' });
  }

  const { summary, description, priority, projectKey } = req.body || {};
  if (!summary) return res.status(400).json({ error: 'summary is required' });
  if (!projectKey) return res.status(400).json({ error: 'projectKey is required' });

  const auth    = Buffer.from(`${email}:${token}`).toString('base64');
  const baseUrl = `https://${domain}`;

  try {
    const body = {
      fields: {
        project:   { key: projectKey },
        summary:   summary,
        issuetype: { name: 'Task' },
        priority:  { name: priority || 'Medium' }
      }
    };
    if (description) {
      body.fields.description = {
        type:    'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }]
      };
    }

    const createRes  = await fetch(`${baseUrl}/rest/api/3/issue`, {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept:         'application/json'
      },
      body: JSON.stringify(body)
    });
    const created = await createRes.json();

    if (created.errorMessages?.length || created.errors) {
      const msg = created.errorMessages?.[0] || JSON.stringify(created.errors);
      return res.status(400).json({ error: msg });
    }

    res.json({
      ok: true,
      issue: {
        key:     created.key,
        summary: summary,
        status:  'To Do',
        priority: priority || 'Medium',
        project: projectKey,
        updated: 'только что',
        url:     `${baseUrl}/browse/${created.key}`
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
