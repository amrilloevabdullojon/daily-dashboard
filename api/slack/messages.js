// api/slack/messages.js
// Fetches Slack DMs, mentions, and unread messages using a Bot Token
// Token is passed from frontend via x-slack-token header (same pattern as Jira)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-slack-token, Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers['x-slack-token'];
  if (!token) return res.status(400).json({ ok: false, error: 'Missing x-slack-token header' });

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    // 1. Fetch auth.test to get bot user ID
    const authRes  = await fetch('https://slack.com/api/auth.test', { headers });
    const authData = await authRes.json();
    if (!authData.ok) return res.status(401).json({ ok: false, error: authData.error || 'Invalid token' });
    const botUserId = authData.user_id;

    // 2. Fetch all conversations (channels + DMs) the bot is member of
    const convRes  = await fetch(
      'https://slack.com/api/conversations.list?types=im,mpim,public_channel,private_channel&limit=200&exclude_archived=true',
      { headers }
    );
    const convData = await convRes.json();
    if (!convData.ok) return res.status(400).json({ ok: false, error: convData.error });

    const channels = convData.channels || [];

    // 3. Find channels with unread messages (unread_count > 0)
    const unreadChannels = channels.filter(c => (c.unread_count || 0) > 0).slice(0, 10);
    const dmChannels     = channels.filter(c => c.is_im && (c.unread_count || 0) > 0).slice(0, 10);

    // 4. Fetch user info for DM channels (to resolve display names)
    const userCache = {};
    const resolveUser = async (userId) => {
      if (!userId) return { name: 'Unknown', avatar: '' };
      if (userCache[userId]) return userCache[userId];
      const uRes  = await fetch(`https://slack.com/api/users.info?user=${userId}`, { headers });
      const uData = await uRes.json();
      const profile = uData.user?.profile || {};
      const info = {
        name:   profile.display_name || profile.real_name || userId,
        avatar: profile.image_48 || ''
      };
      userCache[userId] = info;
      return info;
    };

    // 5. Fetch recent messages from unread channels (limit 3 per channel)
    const fetchMessages = async (channel, limit = 3) => {
      const mRes  = await fetch(
        `https://slack.com/api/conversations.history?channel=${channel.id}&limit=${limit}`,
        { headers }
      );
      const mData = await mRes.json();
      if (!mData.ok) return [];
      return mData.messages || [];
    };

    // 6. Build DM messages list
    const dms = [];
    for (const ch of dmChannels.slice(0, 8)) {
      const msgs = await fetchMessages(ch, 3);
      const userInfo = await resolveUser(ch.user);
      for (const msg of msgs) {
        if (!msg.text || msg.bot_id) continue;
        dms.push({
          id:        msg.ts,
          channelId: ch.id,
          channel:   userInfo.name,
          type:      'dm',
          text:      cleanSlackText(msg.text),
          ts:        msg.ts,
          time:      slackTime(msg.ts),
          avatar:    userInfo.avatar,
          url:       `slack://channel?id=${ch.id}&message=${msg.ts}`
        });
      }
    }

    // 7. Build unread channel messages list
    const unreads = [];
    const publicChannels = unreadChannels.filter(c => !c.is_im && !c.is_mpim).slice(0, 6);
    for (const ch of publicChannels) {
      const msgs = await fetchMessages(ch, 2);
      for (const msg of msgs) {
        if (!msg.text || msg.bot_id) continue;
        const senderInfo = await resolveUser(msg.user);
        unreads.push({
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
        });
      }
    }

    // 8. Find mentions — search recent messages from all channels for the bot user ID
    const mentions = [];
    const allMsgChannels = channels.filter(c => !c.is_im).slice(0, 15);
    for (const ch of allMsgChannels) {
      if (mentions.length >= 10) break;
      const msgs = await fetchMessages(ch, 5);
      for (const msg of msgs) {
        if (!msg.text || msg.bot_id) continue;
        if (msg.text.includes(`<@${botUserId}>`)) {
          const senderInfo = await resolveUser(msg.user);
          mentions.push({
            id:        msg.ts,
            channelId: ch.id,
            channel:   '#' + (ch.name || ch.id),
            type:      'mention',
            text:      cleanSlackText(msg.text),
            ts:        msg.ts,
            time:      slackTime(msg.ts),
            from:      senderInfo.name,
            avatar:    senderInfo.avatar,
            url:       `slack://channel?id=${ch.id}&message=${msg.ts}`
          });
        }
      }
    }

    // 9. Build channels list for compose dropdown
    const composeChannels = channels
      .filter(c => !c.is_archived)
      .slice(0, 50)
      .map(c => ({
        id:   c.id,
        name: c.is_im ? (userCache[c.user]?.name || c.user) : '#' + c.name,
        type: c.is_im ? 'dm' : 'channel'
      }));

    res.json({
      ok: true,
      workspace: authData.team,
      dms:     dms.sort((a,b) => b.ts - a.ts),
      unreads: unreads.sort((a,b) => b.ts - a.ts),
      mentions: mentions.sort((a,b) => b.ts - a.ts),
      channels: composeChannels
    });

  } catch (err) {
    console.error('Slack API error:', err);
    res.status(500).json({ ok: false, error: 'Failed to fetch Slack data', message: err.message });
  }
}

// Convert Slack unix timestamp to readable time
function slackTime(ts) {
  if (!ts) return '';
  const d    = new Date(parseFloat(ts) * 1000);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)    return 'только что';
  if (diff < 3600)  return Math.floor(diff / 60) + ' мин назад';
  if (diff < 86400) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (diff < 86400 * 2) return 'вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

// Remove Slack markup: <@USER>, <#CHANNEL>, <URL|text>, *bold*, _italic_
function cleanSlackText(text) {
  return (text || '')
    .replace(/<@[A-Z0-9]+>/g, '@упоминание')
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, '#$1')
    .replace(/<([^|>]+)\|([^>]+)>/g, '$2')
    .replace(/<([^>]+)>/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim()
    .slice(0, 200);
}
