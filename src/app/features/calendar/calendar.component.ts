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
