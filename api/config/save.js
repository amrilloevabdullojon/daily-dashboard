// api/config/save.js
// Stores Jira/Slack credentials in an httpOnly cookie so they never appear
// in browser request headers or DevTools network logs.

import { parseConfigCookie, setCorsHeaders } from '../_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body || {};
  const { jiraDomain, jiraEmail, jiraToken, jiraProjectKey, slackToken, tgToken, tgChatId } = body;

  // Validate that all provided fields are strings (reject arrays, objects, etc.)
  const stringFields = { jiraDomain, jiraEmail, jiraToken, jiraProjectKey, slackToken, tgToken, tgChatId };
  for (const [key, val] of Object.entries(stringFields)) {
    if (val !== undefined && (typeof val !== 'string' || val.length > 1000)) {
      return res.status(400).json({ error: `Invalid field: ${key}` });
    }
  }

  // Start from the existing cookie so tokens are preserved when not re-entered
  const cfg = { ...parseConfigCookie(req.headers.cookie) };

  // Only overwrite fields that were explicitly provided in this request
  if (jiraDomain?.trim())     cfg.jiraDomain     = jiraDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (jiraEmail?.trim())      cfg.jiraEmail      = jiraEmail.trim();
  if (jiraToken?.trim())      cfg.jiraToken      = jiraToken.trim();
  if (jiraProjectKey?.trim()) cfg.jiraProjectKey = jiraProjectKey.trim();
  if (slackToken?.trim())     cfg.slackToken     = slackToken.trim();
  if (tgToken?.trim())        cfg.tgToken        = tgToken.trim();
  if (tgChatId?.trim())       cfg.tgChatId       = tgChatId.trim();

  const encoded = encodeURIComponent(Buffer.from(JSON.stringify(cfg)).toString('base64'));
  // httpOnly: JS cannot read it; SameSite=Strict: no cross-site leakage
  const maxAge  = 60 * 60 * 24 * 365; // 1 year
  res.setHeader('Set-Cookie', `drConfig=${encoded}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}`);

  res.json({ ok: true });
}
