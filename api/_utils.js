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
