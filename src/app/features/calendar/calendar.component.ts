import { Component, inject, computed, effect, untracked } from '@angular/core';
import { NgClass } from '@angular/common';
import { AppStore } from '../../core/store/app.store';
import { CalendarService } from '../../core/services/calendar.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { FmtDurPipe } from '../../shared/pipes/fmt-dur.pipe';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [NgClass, SkeletonLoaderComponent, FmtDurPipe],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  protected store  = inject(AppStore);
  protected calSvc = inject(CalendarService);

  constructor() {
    effect(() => {
      const date = this.store.currentDate();
      untracked(() => {
        this.store.resetCalEvents();
        this.calSvc.load(date).subscribe();
      });
    });
  }

  events        = computed(() => this.store.calEvents());
  regularEvents = computed(() => {
    const e = this.events();
    if (!Array.isArray(e)) return null;
    return e
      .filter(ev => !ev.allDay)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  });
  allDayEvents  = computed(() => {
    const e = this.events();
    return Array.isArray(e) ? e.filter(ev => ev.allDay) : [];
  });
  focusSlots    = computed(() => {
    const e = this.events();
    if (!Array.isArray(e)) return [];
    return this.calSvc.calcFocusSlots(e);
  });
  totalFocus    = computed(() => this.focusSlots().reduce((s, sl) => s + sl.duration, 0));

  // ── DATE STATE ────────────────────────────────────────────────
  isToday = computed(() => {
    const d = this.store.currentDate();
    return d.toDateString() === new Date().toDateString();
  });

  isPastDate = computed(() => {
    const d = new Date(this.store.currentDate()); d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d < t;
  });

  dateLabel   = computed(() =>
    this.store.currentDate().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  );
  pickerValue = computed(() => this.store.currentDate().toISOString().split('T')[0]);

  // ── NEXT EVENT (today only) ───────────────────────────────────
  nextEvent = computed(() => {
    if (!this.isToday()) return null;
    const events = this.regularEvents();
    if (!events) return null;
    const now = Date.now();
    return events.find(e => new Date(e.start).getTime() > now) ?? null;
  });

  minutesUntilNext = computed(() => {
    const ev = this.nextEvent();
    return ev ? Math.round((new Date(ev.start).getTime() - Date.now()) / 60000) : null;
  });

  // ── DATE NAVIGATION ───────────────────────────────────────────
  prevDay() { this.store.shiftDate(-1); }
  nextDay() { this.store.shiftDate(1); }
  goToday() { this.store.setDate(new Date()); }
  pickDate(input: Event) {
    const val = (input.target as HTMLInputElement).value;
    if (val) this.store.setDate(new Date(val + 'T00:00:00'));
  }

  // ── VIEW TOGGLE ───────────────────────────────────────────────
  viewMode: 'list' | 'timeline' = 'list';
  toggleView() { this.viewMode = this.viewMode === 'list' ? 'timeline' : 'list'; }

  // ── TIMELINE CONSTANTS & HELPERS ──────────────────────────────
  readonly HOUR_START = 8;
  readonly HOUR_END   = 20;
  readonly SLOT_H     = 60; // px per hour

  get timelineHours(): number[] {
    return Array.from(
      { length: this.HOUR_END - this.HOUR_START + 1 },
      (_, i) => i + this.HOUR_START
    );
  }

  get timelineHeight(): number {
    return (this.HOUR_END - this.HOUR_START) * this.SLOT_H;
  }

  nowTop = computed(() => {
    if (!this.isToday()) return -1;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes() - this.HOUR_START * 60;
    if (mins < 0 || mins > (this.HOUR_END - this.HOUR_START) * 60) return -1;
    return (mins / 60) * this.SLOT_H;
  });

  eventTop(ev: { start: string }): number {
    const d = new Date(ev.start);
    const mins = d.getHours() * 60 + d.getMinutes() - this.HOUR_START * 60;
    return Math.max(0, (mins / 60) * this.SLOT_H);
  }

  eventHeight(ev: { start: string; end: string }): number {
    const dur = this.formatDur(ev.start, ev.end);
    return Math.max((dur / 60) * this.SLOT_H, 24);
  }

  // ── ATTENDEE AVATARS ──────────────────────────────────────────
  private readonly AVATAR_PALETTE = [
    '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ef4444',
  ];

  attendeeColors(ev: { color?: string; attendeesCount?: number }): string[] {
    if (!ev.attendeesCount) return [];
    const base = ev.color || this.AVATAR_PALETTE[0];
    // first avatar uses event color, others cycle through palette
    const colors = [base, ...this.AVATAR_PALETTE.filter(c => c !== base)];
    return Array.from({ length: Math.min(ev.attendeesCount, 3) }, (_, i) => colors[i]);
  }

  attendeeExtra(ev: { attendeesCount?: number }): number {
    return Math.max(0, (ev.attendeesCount ?? 0) - 3);
  }

  // ── EVENT STATUS ──────────────────────────────────────────────
  eventStatus(ev: { start: string; end: string }): 'live' | 'upcoming' | 'done' {
    if (this.isPastDate()) return 'done';
    if (!this.isToday()) return 'upcoming';
    const now = Date.now();
    const start = new Date(ev.start).getTime();
    const end   = new Date(ev.end).getTime();
    if (now >= start && now < end) return 'live';
    if (now < start) return 'upcoming';
    return 'done';
  }

  // ── HELPERS ───────────────────────────────────────────────────
  formatRange(start: string, end: string): string {
    const s = new Date(start), e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(s)} – ${fmt(e)}`;
  }

  formatDur(start: string, end: string): number {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  }

  getColor(ev: { color?: string }): string { return ev.color || '#3b82f6'; }
}
