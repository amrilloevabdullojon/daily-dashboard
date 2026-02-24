// api/_utils.js — shared utility functions for API routes
// Note: this file is ESM, imported with a relative path + .js extension

/**
 * Format a date/timestamp as a Russian relative-time string.
 * @param {string|number|Date} input  ISO datetime string, Unix seconds (number), or Date
 * @returns {string}
 */
export function formatRelativeTime(input) {
  if (!input) return '';

  let d;
  if (typeof input === 'number') {
    // Unix timestamp in seconds (Slack style)
    d = new Date(input * 1000);
  } else {
    d = new Date(input);
  }

  if (isNaN(d.getTime())) return '';

  const now  = new Date();
  const diff = Math.floor((now - d) / 1000); // seconds

  if (diff < 60)           return 'только что';
  if (diff < 3600)         return Math.floor(diff / 60) + ' мин назад';
  if (diff < 86400)        return Math.floor(diff / 3600) + ' ч назад';
  if (diff < 86400 * 2)    return 'вчера';
  if (diff < 86400 * 7)    return Math.floor(diff / 86400) + ' дн. назад';

  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * Parse the drConfig httpOnly cookie set by /api/config/save.
 * Returns the decoded config object or an empty object if absent/invalid.
 * @param {string|undefined} cookieHeader  The raw Cookie request header value
 * @returns {Record<string, string>}
 */
/**
 * Set CORS headers for API responses.
 * Restricts allowed origins to ALLOWED_ORIGIN env var (production) or
 * any localhost origin (development). Browsers block CORS from unknown origins.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 */
export function setCorsHeaders(req, res) {
  const origin  = req.headers.origin || '';
  const allowed = process.env.ALLOWED_ORIGIN || '';
  const isAllowed = !origin
    || (allowed && origin === allowed)
    || (!allowed && origin.startsWith('http://localhost'));

  res.setHeader('Access-Control-Allow-Origin',  isAllowed ? (origin || '*') : (allowed || 'null'));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods',  'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',  'Content-Type');
}

export function parseConfigCookie(cookieHeader) {
  if (!cookieHeader) return {};
  const match = cookieHeader.match(/drConfig=([^;]+)/);
  if (!match) return {};
  try {
    return JSON.parse(Buffer.from(decodeURIComponent(match[1]), 'base64').toString());
  } catch {
    return {};
  }
}
