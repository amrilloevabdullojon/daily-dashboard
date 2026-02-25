import { Component, inject, computed } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { AppStore } from '../../core/store/app.store';
import { CalendarService } from '../../core/services/calendar.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { FmtDurPipe } from '../../shared/pipes/fmt-dur.pipe';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, SkeletonLoaderComponent, FmtDurPipe],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  protected store  = inject(AppStore);
  protected calSvc = inject(CalendarService);

  events = computed(() => this.store.calEvents());

  regularEvents = computed(() => {
    const e = this.events();
    return Array.isArray(e) ? e.filter(ev => !ev.allDay) : null;
  });

  allDayEvents = computed(() => {
    const e = this.events();
    return Array.isArray(e) ? e.filter(ev => ev.allDay) : [];
  });

  focusSlots = computed(() => {
    const e = this.events();
    if (!Array.isArray(e)) return [];
    return this.calSvc.calcFocusSlots(e);
  });

  totalFocus = computed(() => {
    return this.focusSlots().reduce((s, slot) => s + slot.duration, 0);
  });

  todayLabel = computed(() => {
    return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  });

  nextEvent = computed(() => {
    const events = this.regularEvents();
    if (!events) return null;
    const now = Date.now();
    return events.find(e => new Date(e.start).getTime() > now) ?? null;
  });

  minutesUntilNext = computed(() => {
    const ev = this.nextEvent();
    if (!ev) return null;
    return Math.round((new Date(ev.start).getTime() - Date.now()) / 60000);
  });

  eventStatus(ev: { start: string; end: string }): 'live' | 'upcoming' | 'done' {
    const now = Date.now();
    const start = new Date(ev.start).getTime();
    const end = new Date(ev.end).getTime();
    if (now >= start && now < end) return 'live';
    if (now < start) return 'upcoming';
    return 'done';
  }

  formatRange(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(s)} – ${fmt(e)}`;
  }

  formatDur(start: string, end: string): number {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.round(diff / 60000);
  }

  getColor(ev: { color?: string }): string {
    return ev.color || '#3b82f6';
  }
}
