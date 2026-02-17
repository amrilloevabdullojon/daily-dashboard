// api/slack/messages.js
// Fetches Slack DMs, mentions, and unread messages using a Bot Token
// Token is passed from frontend via x-slack-token header (same pattern as Jira)
// Uses parallel fetch to stay well within Vercel's 10s serverless timeout

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-slack-token, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers['x-slack-token'];
  if (!token) return res.status(400).json({ ok: false, error: 'Missing x-slack-token header' });

  // Only pass Authorization header — Content-Type not needed for GET requests
  const authHeader = { Authorization: `Bearer ${token}` };

  try {
    // 1. Validate token and get bot user ID
    const authRes  = await fetch('https://slack.com/api/auth.test', { headers: authHeader });
    const authData = await authRes.json();
    if (!authData.ok) {
      return res.status(401).json({ ok: false, error: authData.error || 'invalid_auth' });
    }
    const botUserId = authData.user_id;

    // 2. Fetch all conversations the bot is member of
    // Note: private_channel requires groups:read scope — use only im, mpim, public_channel
    const convRes  = await fetch(
      'https://slack.com/api/conversations.list?types=im,mpim,public_channel&limit=200&exclude_archived=true',
      { headers: authHeader }
    );
    const convData = await convRes.json();
    if (!convData.ok) {
      return res.status(400).json({ ok: false, error: convData.error || 'conversations_list_failed' });
    }

    const channels = convData.channels || [];

    // 3. Separate DM and public channel lists — limit aggressively for speed
    const dmChannels     = channels.filter(c => c.is_im).slice(0, 5);
    const publicChannels = channels.filter(c => !c.is_im && !c.is_mpim).slice(0, 10);

    // Helper: fetch history for one channel, returns [] on any error
    const fetchHistory = async (channelId, limit = 3) => {
      try {
        const r = await fetch(
          `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
          { headers: authHeader }
        );
        const d = await r.json();
        return d.ok ? (d.messages || []) : [];
      } catch { return []; }
    };

    // Helper: resolve a user's display name + avatar (cached)
    const userCache = {};
    const resolveUser = async (userId) => {
      if (!userId) return { name: 'Unknown', avatar: '' };
      if (userCache[userId]) return userCache[userId];
      try {
        const r = await fetch(`https://slack.com/api/users.info?user=${userId}`, { headers: authHeader });
        const d = await r.json();
        const profile = d.user?.profile || {};
        const info = {
          name:   profile.display_name || profile.real_name || userId,
          avatar: profile.image_48 || ''
        };
        userCache[userId] = info;
        return info;
      } catch {
        userCache[userId] = { name: userId, avatar: '' };
        return userCache[userId];
      }
    };

    // 4. Fetch DM histories and public channel histories IN PARALLEL
    const [dmHistories, pubHistories] = await Promise.all([
      Promise.all(dmChannels.map(ch => fetchHistory(ch.id, 3).then(msgs => ({ ch, msgs })))),
      Promise.all(publicChannels.map(ch => fetchHistory(ch.id, 5).then(msgs => ({ ch, msgs }))))
    ]);

    // 5. Collect all unique user IDs that need resolving
    const allUserIds = new Set();
    dmChannels.forEach(ch => { if (ch.user) allUserIds.add(ch.user); });
    dmHistories.forEach(({ msgs }) => msgs.forEach(m => { if (m.user) allUserIds.add(m.user); }));
    pubHistories.forEach(({ msgs }) => msgs.forEach(m => { if (m.user) allUserIds.add(m.user); }));

    // 6. Resolve all users IN PARALLEL
    await Promise.all([...allUserIds].map(id => resolveUser(id)));

    // 7. Build DMs list
    const dms = [];
    for (const { ch, msgs } of dmHistories) {
      const userInfo = await resolveUser(ch.user);
      for (const msg of msgs) {
        if (!msg.text || msg.bot_id || msg.subtype) continue;
        dms.push({
          id:        msg.ts,
          channelId: ch.id,
          channel:   userInfo.name,
          type:      'dm',
          text:      cleanSlackText(msg.text),
          ts:        msg.ts,
          time:      slackTime(msg.ts),
          avatar:    userInfo.avatar,
          from:      userInfo.name,
          url:       `slack://channel?id=${ch.id}&message=${msg.ts}`
        });
      }
    }

    // 8. Build unread channel messages + find mentions
    const unreads  = [];
    const mentions = [];

    for (const { ch, msgs } of pubHistories) {
      for (const msg of msgs) {
        if (!msg.text || msg.bot_id || msg.subtype) continue;
        const senderInfo = userCache[msg.user] || { name: msg.user || 'Unknown', avatar: '' };
        const item = {
          id:        msg.ts,
          channelId: ch.id,
          channel:   '#' + (ch.name || ch.id),
          type:      'channel',
          text:      cleanSlackText(msg.text),
          ts:        msg.ts,
          time:      slackTime(msg.ts),
          from:      senderInfo.name,
          avatar:    senderInfo.avatar,
          url:       `slack://channel?id=${ch.id}&message=${msg.ts}`
        };

        // Check if this is a mention
        if (msg.text.includes(`<@${botUserId}>`)) {
          if (mentions.length < 10) {
            mentions.push({ ...item, type: 'mention' });
          }
        } else if (ch.unread_count > 0 && unreads.length < 15) {
          unreads.push(item);
        }
      }
    }

    // 9. Build compose channel list (all available channels)
    const composeChannels = channels
      .filter(c => !c.is_archived)
      .slice(0, 100)
      .map(c => ({
        id:   c.id,
        name: c.is_im ? (userCache[c.user]?.name || c.user || 'DM') : '#' + (c.name || c.id),
        type: c.is_im ? 'dm' : 'channel'
      }));

    res.json({
      ok:       true,
      workspace: authData.team,
      dms:      dms.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts)),
      unreads:  unreads.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts)),
      mentions: mentions.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts)),
      channels: composeChannels
    });

  } catch (err) {
    console.error('Slack API error:', err);
    res.status(500).json({ ok: false, error: 'server_error', message: err.message });
  }
}

// Convert Slack unix timestamp string to readable time
function slackTime(ts) {
  if (!ts) return '';
  const d    = new Date(parseFloat(ts) * 1000);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)        return 'только что';
  if (diff < 3600)      return Math.floor(diff / 60) + ' мин назад';
  if (diff < 86400)     return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (diff < 86400 * 2) return 'вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Strip Slack mrkdwn/HTML: <@USER>, <#CH|name>, <url|text>, *bold*, _italic_
function cleanSlackText(text) {
  return (text || '')
    .replace(/<@[A-Z0-9]+>/g, '@упоминание')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<([^>]+)>/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 200);
}
