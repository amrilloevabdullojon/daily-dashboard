import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { CalendarService } from './calendar.service';
import { AppStore } from '../store/app.store';
import { ConfigService } from './config.service';
import { CalEvent, remoteLoading, AppConfig } from '../models';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Create a non-all-day CalEvent on 2024-01-15 with given HH:MM times. */
function makeEvent(startTime: string, endTime: string): CalEvent {
  return {
    id: Math.random().toString(36).slice(2),
    title: 'Meeting',
    start: `2024-01-15T${startTime}:00`,
    end:   `2024-01-15T${endTime}:00`,
    allDay: false,
  };
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('CalendarService.calcFocusSlots', () => {
  let service: CalendarService;
  let httpMock: HttpTestingController;

  const storeStub = {
    currentDate:    signal(new Date('2024-01-15')),
    resetCalEvents: jest.fn(),
    setCalEvents:   jest.fn(),
    calEvents:      signal(remoteLoading),
  };

  // Default config: workday 09:00–18:00
  let configReturnValue: Partial<AppConfig> = {};

  const configStub = {
    get: jest.fn<Partial<AppConfig>, []>(() => configReturnValue),
  };

  beforeEach(() => {
    configReturnValue = {};   // reset to defaults (service uses ?? fallbacks)
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CalendarService,
        { provide: AppStore,       useValue: storeStub },
        { provide: ConfigService,  useValue: configStub },
      ],
    });

    service  = TestBed.inject(CalendarService);
    httpMock = TestBed.inject(HttpTestingController);

    // Flush any HTTP requests triggered by the constructor effect (0 or more)
    httpMock.match(req => req.url.includes('/api/calendar/events'))
            .forEach(r => r.flush([]));
  });

  afterEach(() => httpMock.verify());

  // ── No events ────────────────────────────────────────────────────────────────

  it('returns a single full-day slot when there are no events', () => {
    const slots = service.calcFocusSlots([]);
    expect(slots).toHaveLength(1);
    // 9h × 60 = 540 min start; 18h × 60 = 1080 min end; 9h duration = 540 min
    expect(slots[0]).toEqual({ start: 9 * 60, end: 18 * 60, duration: 9 * 60 });
  });

  // ── Single meeting ────────────────────────────────────────────────────────────

  it('creates slots before and after a mid-day meeting', () => {
    //  09:00 ──[free 2h]── 11:00 ──[mtg 1h]── 12:00 ──[free 6h]── 18:00
    const slots = service.calcFocusSlots([makeEvent('11:00', '12:00')]);

    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual({ start: 9 * 60,  end: 11 * 60, duration: 2 * 60 });
    expect(slots[1]).toEqual({ start: 12 * 60, end: 18 * 60, duration: 6 * 60 });
  });

  it('has no slot before a meeting that starts at workday start', () => {
    //  09:00 ──[mtg]── 10:00 ──[free 8h]── 18:00
    const slots = service.calcFocusSlots([makeEvent('09:00', '10:00')]);

    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({ start: 10 * 60, end: 18 * 60, duration: 8 * 60 });
  });

  it('has no slot after a meeting that ends at workday end', () => {
    //  09:00 ──[free 8h]── 17:00 ──[mtg]── 18:00
    const slots = service.calcFocusSlots([makeEvent('17:00', '18:00')]);

    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({ start: 9 * 60, end: 17 * 60, duration: 8 * 60 });
  });

  // ── All-day events ────────────────────────────────────────────────────────────

  it('ignores all-day events entirely', () => {
    const holiday: CalEvent = {
      id: 'h1', title: 'Holiday',
      start: '2024-01-15', end: '2024-01-15', allDay: true,
    };
    const slots = service.calcFocusSlots([holiday]);

    expect(slots).toHaveLength(1);
    expect(slots[0].duration).toBe(9 * 60);
  });

  // ── Gap filtering ─────────────────────────────────────────────────────────────

  it('omits gaps shorter than 30 minutes', () => {
    //  09:00–09:20 meeting, then 09:30–18:00 meeting → 10-min gap ignored
    const slots = service.calcFocusSlots([
      makeEvent('09:00', '09:20'),
      makeEvent('09:30', '18:00'),
    ]);
    expect(slots).toHaveLength(0);
  });

  it('includes gaps of exactly 30 minutes', () => {
    //  09:00–10:00 then 10:30–18:00 → exactly 30-min gap kept
    const slots = service.calcFocusSlots([
      makeEvent('09:00', '10:00'),
      makeEvent('10:30', '18:00'),
    ]);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({ start: 10 * 60, end: 10 * 60 + 30, duration: 30 });
  });

  // ── Overlapping meetings ──────────────────────────────────────────────────────

  it('merges overlapping meetings and creates correct outer slots', () => {
    //  10:00–12:00 and 11:00–13:00 overlap → effectively 10:00–13:00
    //  slot before: 09:00–10:00 (60 min), slot after: 13:00–18:00 (300 min)
    const slots = service.calcFocusSlots([
      makeEvent('10:00', '12:00'),
      makeEvent('11:00', '13:00'),
    ]);
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual({ start:  9 * 60, end: 10 * 60, duration:  1 * 60 });
    expect(slots[1]).toEqual({ start: 13 * 60, end: 18 * 60, duration:  5 * 60 });
  });

  // ── Custom working hours ──────────────────────────────────────────────────────

  it('respects custom workdayStart and workdayEnd from config', () => {
    configReturnValue = { workdayStart: 10, workdayEnd: 17 };

    const slots = service.calcFocusSlots([]);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toEqual({ start: 10 * 60, end: 17 * 60, duration: 7 * 60 });
  });

  it('uses 09:00–18:00 as defaults when config values are absent', () => {
    configReturnValue = {};   // no workdayStart / workdayEnd

    const slots = service.calcFocusSlots([]);
    expect(slots[0]).toEqual({ start: 540, end: 1080, duration: 540 });
  });

  // ── formatTime helper ─────────────────────────────────────────────────────────

  it('formatTime pads hours and minutes to 2 digits', () => {
    expect(service.formatTime(9 * 60)).toBe('09:00');
    expect(service.formatTime(9 * 60 + 5)).toBe('09:05');
    expect(service.formatTime(13 * 60 + 30)).toBe('13:30');
    expect(service.formatTime(0)).toBe('00:00');
  });
});
