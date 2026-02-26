import { Injectable, inject, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, retry } from 'rxjs';
import { CalEvent, FocusSlot } from '../models';
import { AppStore } from '../store/app.store';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http   = inject(HttpClient);
  private store  = inject(AppStore);
  private config = inject(ConfigService);

  constructor() {
    // Single source of truth: reload whenever the selected date changes.
    // Running in the root service means exactly one subscription fires
    // regardless of how many components read calendar data.
    effect(() => {
      const date = this.store.currentDate();
      untracked(() => {
        this.store.resetCalEvents();
        this.load(date).subscribe();
      });
    });
  }

  load(date?: Date): Observable<CalEvent[]> {
    const d = date || this.store.currentDate();
    const params: Record<string, string> = {};
    if (d) {
      params['date'] = d.toISOString().split('T')[0];
    }
    return this.http.get<CalEvent[]>('/api/calendar/events', { params }).pipe(
      retry({ count: 2, delay: 1000 }),
      tap(events => this.store.setCalEvents(events)),
      catchError(() => {
        this.store.setCalEvents([]);
        return of([]);
      })
    );
  }

  /** Calculate focus time slots between meetings */
  calcFocusSlots(events: CalEvent[]): FocusSlot[] {
    const cfg = this.config.get();
    const DAY_START = (cfg.workdayStart ?? 9) * 60;
    const DAY_END   = (cfg.workdayEnd   ?? 18) * 60;

    const work = events
      .filter(e => !e.allDay)
      .map(e => ({
        start: this.toMinutes(e.start),
        end:   this.toMinutes(e.end),
      }))
      .filter(e => !isNaN(e.start) && !isNaN(e.end) && e.end >= e.start)
      .sort((a, b) => a.start - b.start);

    const slots: FocusSlot[] = [];
    let cursor = DAY_START;
    for (const ev of work) {
      if (ev.start > cursor) {
        const dur = ev.start - cursor;
        if (dur >= 30) {
          slots.push({ start: cursor, end: ev.start, duration: dur });
        }
      }
      cursor = Math.max(cursor, ev.end);
    }
    if (cursor < DAY_END) {
      const dur = DAY_END - cursor;
      if (dur >= 30) slots.push({ start: cursor, end: DAY_END, duration: dur });
    }
    return slots;
  }

  formatTime(mins: number): string {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  private toMinutes(dateStr: string): number {
    const d = new Date(dateStr);
    return d.getHours() * 60 + d.getMinutes();
  }

  search(query: string): Observable<CalEvent[]> {
    const rd = this.store.calEvents();
    if (rd.status !== 'ok' || !query) return of([]);
    const q = query.toLowerCase();
    return of(
      rd.data.filter(e => e.title.toLowerCase().includes(q)).slice(0, 3)
    );
  }
}
