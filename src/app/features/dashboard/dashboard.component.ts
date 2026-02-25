import { Component, inject, computed, effect, untracked } from '@angular/core';
import { NgClass, NgFor, NgIf, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AppStore } from '../../core/store/app.store';
import { CalendarService } from '../../core/services/calendar.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { SmartTimePipe } from '../../shared/pipes/smart-time.pipe';
import { StatusTypePipe } from '../../shared/pipes/status-label.pipe';
import { FmtDurPipe } from '../../shared/pipes/fmt-dur.pipe';
import { JiraService } from '../../core/services/jira.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NgClass, NgFor, NgIf, DatePipe, RouterLink,
    StatCardComponent, SkeletonLoaderComponent, StatusPillComponent,
    SmartTimePipe, StatusTypePipe, FmtDurPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected store   = inject(AppStore);
  protected calSvc  = inject(CalendarService);
  protected jiraSvc = inject(JiraService);

  constructor() {
    // Reload calendar whenever the selected date changes
    effect(() => {
      const date = this.store.currentDate();
      untracked(() => {
        this.store.resetCalEvents();
        this.calSvc.load(date).subscribe();
      });
    });
  }

  // ── GREETING ──────────────────────────────────────────────────
  greeting = computed(() => {
    const hour = new Date().getHours();
    const user = this.store.currentUser();
    const name = user?.name?.split(' ')[0] || '';
    let greet = '';
    if (hour < 12) greet = 'Доброе утро';
    else if (hour < 18) greet = 'Добрый день';
    else greet = 'Добрый вечер';
    return name ? `${greet}, ${name}` : greet;
  });

  // ── DATE STATE ────────────────────────────────────────────────
  isToday = computed(() => {
    const d = this.store.currentDate();
    return d.toDateString() === new Date().toDateString();
  });

  dateLabel   = computed(() =>
    this.store.currentDate().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  );
  pickerValue = computed(() => this.store.currentDate().toISOString().split('T')[0]);

  prevDay() { this.store.shiftDate(-1); }
  nextDay() { this.store.shiftDate(1); }
  goToday() { this.store.setDate(new Date()); }
  pickDate(input: Event) {
    const val = (input.target as HTMLInputElement).value;
    if (val) this.store.setDate(new Date(val + 'T00:00:00'));
  }

  // ── NEXT EVENT (today only) ───────────────────────────────────
  nextEvent = computed(() => {
    if (!this.isToday()) return null;
    const events = this.store.calEvents();
    if (!Array.isArray(events)) return null;
    const now = new Date();
    return events.find(e => !e.allDay && new Date(e.start) > now) ?? null;
  });

  // ── COMPUTED STATS ────────────────────────────────────────────
  unreadCount = computed(() => {
    const msgs = this.store.gmailMessages();
    return Array.isArray(msgs) ? msgs.filter(m => m.unread).length : null;
  });

  todayEventsCount = computed(() => {
    const events = this.store.calEvents();
    return Array.isArray(events) ? events.filter(e => !e.allDay).length : null;
  });

  activeTasks = computed(() => {
    const tasks = this.store.realTasks();
    return Array.isArray(tasks) ? tasks.filter(t => !t.done).length : null;
  });

  activeJira = computed(() => {
    const issues = this.store.jiraIssues();
    if (!Array.isArray(issues)) return null;
    return issues.filter(i => {
      const s = i.status?.toLowerCase() || '';
      return s.includes('progress') || s.includes('review');
    }).length;
  });

  // ── TASK PROGRESS ─────────────────────────────────────────────
  taskProgress = computed(() => {
    const tasks = this.store.realTasks();
    if (!Array.isArray(tasks) || tasks.length === 0) return null;
    const done  = tasks.filter(t => t.done).length;
    const total = tasks.length;
    return { done, total, pct: Math.round((done / total) * 100) };
  });

  // ── FOCUS TIME ────────────────────────────────────────────────
  totalFocusMinutes = computed(() => {
    const events = this.store.calEvents();
    if (!Array.isArray(events)) return null;
    const slots = this.calSvc.calcFocusSlots(events);
    return slots.reduce((sum, s) => sum + s.duration, 0);
  });

  // ── PREVIEW DATA ──────────────────────────────────────────────
  previewEmails = computed(() => {
    const msgs = this.store.gmailMessages();
    return Array.isArray(msgs) ? msgs.slice(0, 5) : null;
  });

  // Show all events for selected date, sorted by start time
  previewEvents = computed(() => {
    const events = this.store.calEvents();
    if (!Array.isArray(events)) return null;
    return events
      .filter(e => !e.allDay)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  });

  previewIssues = computed(() => {
    const issues = this.store.jiraIssues();
    return Array.isArray(issues) ? issues.slice(0, 5) : null;
  });

  previewTasks = computed(() => {
    const tasks = this.store.realTasks();
    return Array.isArray(tasks) ? tasks.filter(t => !t.done).slice(0, 5) : null;
  });

  // ── HELPERS ───────────────────────────────────────────────────
  formatEventTime(start: string, end: string): string {
    const s = new Date(start), e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(s)} – ${fmt(e)}`;
  }

  isEventPast(ev: { end: string }): boolean {
    return new Date(ev.end).getTime() < Date.now();
  }

  getEventColor(ev: { color?: string }): string { return ev.color || '#3b82f6'; }

  jiraStatusType(status: string) {
    return this.jiraSvc.statusClass(status).replace('status-', '') as any;
  }
}
