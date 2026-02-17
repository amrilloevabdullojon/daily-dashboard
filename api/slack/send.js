// api/slack/send.js
// Sends a Slack message via chat.postMessage
// Token passed via x-slack-token header

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-slack-token, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers['x-slack-token'];
  if (!token) return res.status(400).json({ ok: false, error: 'Missing x-slack-token header' });

  const { channel, text } = req.body || {};
  if (!channel || !text?.trim()) {
    return res.status(400).json({ ok: false, error: 'channel and text are required' });
  }

  try {
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ channel, text: text.trim() })
    });

    const data = await slackRes.json();

    if (!data.ok) {
      return res.status(400).json({ ok: false, error: data.error || 'Slack API error' });
    }

    res.json({ ok: true, ts: data.ts, channel: data.channel });
  } catch (err) {
    console.error('Slack send error:', err);
    res.status(500).json({ ok: false, error: 'Failed to send message', message: err.message });
  }
}
