import { Component, inject, computed } from '@angular/core';
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
  protected store    = inject(AppStore);
  protected calSvc   = inject(CalendarService);
  protected jiraSvc  = inject(JiraService);

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

  previewEvents = computed(() => {
    const events = this.store.calEvents();
    if (!Array.isArray(events)) return null;
    const now = new Date();
    return events
      .filter(e => !e.allDay && new Date(e.start) >= now)
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
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${fmt(s)} – ${fmt(e)}`;
  }

  getEventColor(ev: { color?: string }): string {
    return ev.color || '#3b82f6';
  }

  jiraStatusType(status: string) {
    return this.jiraSvc.statusClass(status).replace('status-', '') as any;
  }
}
