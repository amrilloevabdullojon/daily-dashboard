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
    // Time range: today from 00:00 to 23:59
    const now       = new Date();
    const timeMin   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const timeMax   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

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
      const start = ev.start?.dateTime || ev.start?.date || '';
      const end   = ev.end?.dateTime   || ev.end?.date   || '';

      const startDate = new Date(start);
      const endDate   = new Date(end);

      const pad = n => String(n).padStart(2, '0');
      const startStr = ev.start?.dateTime
        ? `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`
        : 'Весь день';
      const endStr = ev.end?.dateTime
        ? `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`
        : '';

      const attendees = (ev.attendees || []).length || 1;
      const color     = ev.colorId
        ? GOOGLE_COLORS[ev.colorId] || '#3b82f6'
        : '#3b82f6';

      return {
        id:         ev.id,
        title:      ev.summary || '(без названия)',
        start:      startStr,
        end:        endStr,
        color,
        attendees,
        location:   ev.location || '',
        meetLink:   ev.hangoutLink || '',
        allDay:     !ev.start?.dateTime
      };
    });

    res.json({ events });
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
