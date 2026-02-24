// api/config/load.js
// Returns which integrations are configured (boolean flags only — never the actual tokens).

import { parseConfigCookie, setCorsHeaders } from '../_utils.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const cfg = parseConfigCookie(req.headers.cookie);

  res.json({
    ok: true,
    configured: {
      jira:  !!(cfg.jiraDomain && cfg.jiraEmail && cfg.jiraToken),
      slack: !!cfg.slackToken,
    },
  });
}
