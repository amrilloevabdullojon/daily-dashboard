// api/calendar/events.js
// Returns today's Google Calendar events

import { getAccessToken } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const accessToken = await getAccessToken(req, res);
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated', loginUrl: '/api/auth/google' });
  }

  try {
    // Time range: use requested date or today
    const base = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(base.getTime())) {
      return res.status(400).json({ error: 'Invalid date parameter' });
    }
    const timeMin = new Date(base.getFullYear(), base.getMonth(), base.getDate(),  0,  0,  0).toISOString();
    const timeMax = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59).toISOString();

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy:      'startTime',
        maxResults:   '20'
      });

    const evRes  = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const evData = await evRes.json();

    if (evData.error) {
      return res.status(400).json({ error: evData.error.message });
    }

    const events = (evData.items || []).map(ev => {
      const allDay = !ev.start?.dateTime;
      const start  = ev.start?.dateTime || ev.start?.date || '';
      const end    = ev.end?.dateTime   || ev.end?.date   || '';

      const attendeesCount = (ev.attendees || []).length || 1;
      const color          = ev.colorId
        ? GOOGLE_COLORS[ev.colorId] || '#3b82f6'
        : '#3b82f6';

      return {
        id:             ev.id,
        title:          ev.summary || '(без названия)',
        start,          // ISO datetime string — e.g. "2024-01-15T14:30:00+03:00"
        end,            // ISO datetime string
        color,
        attendeesCount,
        location:       ev.location || '',
        hangoutLink:    ev.hangoutLink || '',
        allDay,
      };
    });

    res.json(events);
  } catch (err) {
    console.error('Calendar API error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
}

// Google Calendar color IDs → hex
const GOOGLE_COLORS = {
  '1':  '#7986cb', // Lavender
  '2':  '#33b679', // Sage
  '3':  '#8e24aa', // Grape
  '4':  '#e67c73', // Flamingo
  '5':  '#f6bf26', // Banana
  '6':  '#f4511e', // Tangerine
  '7':  '#039be5', // Peacock
  '8':  '#616161', // Graphite
  '9':  '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
};
