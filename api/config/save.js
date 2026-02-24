// api/config/save.js
// Stores Jira/Slack credentials in an httpOnly cookie so they never appear
// in browser request headers or DevTools network logs.

import { setCorsHeaders } from '../_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { jiraDomain, jiraEmail, jiraToken, jiraProjectKey, slackToken } = req.body || {};

  // Build a minimal object — only store the fields we actually need server-side
  const cfg = {};
  if (jiraDomain)     cfg.jiraDomain     = String(jiraDomain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (jiraEmail)      cfg.jiraEmail      = String(jiraEmail);
  if (jiraToken)      cfg.jiraToken      = String(jiraToken);
  if (jiraProjectKey) cfg.jiraProjectKey = String(jiraProjectKey);
  if (slackToken)     cfg.slackToken     = String(slackToken);

  const encoded = encodeURIComponent(Buffer.from(JSON.stringify(cfg)).toString('base64'));
  // httpOnly: JS cannot read it; SameSite=Strict: no cross-site leakage
  const maxAge  = 60 * 60 * 24 * 365; // 1 year
  res.setHeader('Set-Cookie', `drConfig=${encoded}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}`);

  res.json({ ok: true });
}
