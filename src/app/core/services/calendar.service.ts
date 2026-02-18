import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { CalEvent, FocusSlot } from '../models';
import { AppStore } from '../store/app.store';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private store = inject(AppStore);

  load(date?: Date): Observable<CalEvent[]> {
    const d = date || this.store.currentDate();
    const params: Record<string, string> = {};
    if (d) {
      params['date'] = d.toISOString().split('T')[0];
    }
    return this.http.get<CalEvent[]>('/api/calendar/events', { params }).pipe(
      tap(events => this.store.setCalEvents(events)),
      catchError(() => {
        this.store.setCalEvents([]);
        return of([]);
      })
    );
  }

  /** Calculate focus time slots between meetings */
  calcFocusSlots(events: CalEvent[]): FocusSlot[] {
    const work = events
      .filter(e => !e.allDay)
      .map(e => ({
        start: this.toMinutes(e.start),
        end:   this.toMinutes(e.end),
      }))
      .sort((a, b) => a.start - b.start);

    const slots: FocusSlot[] = [];
    const DAY_START = 9 * 60;  // 09:00
    const DAY_END   = 18 * 60; // 18:00

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

  formatDuration(mins: number): string {
    if (mins < 60) return `${mins}м`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  }

  private toMinutes(dateStr: string): number {
    const d = new Date(dateStr);
    return d.getHours() * 60 + d.getMinutes();
  }

  search(query: string): Observable<CalEvent[]> {
    const events = this.store.calEvents();
    if (!Array.isArray(events) || !query) return of([]);
    const q = query.toLowerCase();
    return of(
      events.filter(e => e.title.toLowerCase().includes(q)).slice(0, 3)
    );
  }
}
