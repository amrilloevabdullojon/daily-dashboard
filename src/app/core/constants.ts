// src/app/core/constants.ts
// Shared constants to replace magic numbers across the codebase

/** Auto-refresh interval for all data sources (ms) */
export const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/** Default toast display duration (ms) */
export const TOAST_DURATION_MS = 3000; // 3 seconds

/** Work day start in minutes from midnight (09:00) */
export const DAY_START_MINS = 9 * 60;

/** Work day end in minutes from midnight (18:00) */
export const DAY_END_MINS = 18 * 60;

/** Minimum focus slot duration to display (minutes) */
export const MIN_FOCUS_SLOT_MINS = 30;

/** TTL for meeting notification deduplication (ms) */
export const NOTIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
