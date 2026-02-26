import { SmartTimePipe } from './smart-time.pipe';

describe('SmartTimePipe', () => {
  let pipe: SmartTimePipe;

  // Pin "now" so all relative-time assertions are deterministic
  const NOW = new Date('2024-01-15T12:00:00.000Z').getTime();

  beforeEach(() => {
    pipe = new SmartTimePipe();
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Edge cases ──────────────────────────────────────────────────
  it('returns empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('returns empty string for an empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('returns empty string for an invalid date string', () => {
    expect(pipe.transform('not-a-date')).toBe('');
  });

  // ── "только что" ────────────────────────────────────────────────
  it('returns "только что" for 10 seconds ago', () => {
    const date = new Date(NOW - 10_000).toISOString();
    expect(pipe.transform(date)).toBe('только что');
  });

  it('returns "только что" for exactly 0 ms ago', () => {
    expect(pipe.transform(new Date(NOW).toISOString())).toBe('только что');
  });

  // ── Minutes ──────────────────────────────────────────────────────
  it('returns "1 мин" for 1 minute ago', () => {
    const date = new Date(NOW - 60_000).toISOString();
    expect(pipe.transform(date)).toBe('1 мин');
  });

  it('returns "5 мин" for 5 minutes ago', () => {
    const date = new Date(NOW - 5 * 60_000).toISOString();
    expect(pipe.transform(date)).toBe('5 мин');
  });

  it('returns "59 мин" for 59 minutes ago', () => {
    const date = new Date(NOW - 59 * 60_000).toISOString();
    expect(pipe.transform(date)).toBe('59 мин');
  });

  // ── Hours ────────────────────────────────────────────────────────
  it('returns "1 ч" for 1 hour ago', () => {
    const date = new Date(NOW - 3_600_000).toISOString();
    expect(pipe.transform(date)).toBe('1 ч');
  });

  it('returns "3 ч" for 3 hours ago', () => {
    const date = new Date(NOW - 3 * 3_600_000).toISOString();
    expect(pipe.transform(date)).toBe('3 ч');
  });

  it('returns "23 ч" for 23 hours ago', () => {
    const date = new Date(NOW - 23 * 3_600_000).toISOString();
    expect(pipe.transform(date)).toBe('23 ч');
  });

  // ── "вчера" ──────────────────────────────────────────────────────
  it('returns "вчера" for exactly 1 day ago', () => {
    const date = new Date(NOW - 86_400_000).toISOString();
    expect(pipe.transform(date)).toBe('вчера');
  });

  // ── Days ─────────────────────────────────────────────────────────
  it('returns "2 дн" for 2 days ago', () => {
    const date = new Date(NOW - 2 * 86_400_000).toISOString();
    expect(pipe.transform(date)).toBe('2 дн');
  });

  it('returns "6 дн" for 6 days ago', () => {
    const date = new Date(NOW - 6 * 86_400_000).toISOString();
    expect(pipe.transform(date)).toBe('6 дн');
  });

  // ── Formatted date for >= 7 days ─────────────────────────────────
  it('returns a non-empty date string for 10 days ago', () => {
    const date = new Date(NOW - 10 * 86_400_000).toISOString();
    const result = pipe.transform(date);
    // Should be something like "5 янв" — not empty and not a relative phrase
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/мин|ч$|дн|вчера|только что/);
  });
});
