import { Component, inject, computed } from '@angular/core';
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
import { SheetsService } from '../../core/services/sheets.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    StatCardComponent, SkeletonLoaderComponent, StatusPillComponent,
    SmartTimePipe, StatusTypePipe, FmtDurPipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected store     = inject(AppStore);
  protected calSvc    = inject(CalendarService);
  protected jiraSvc   = inject(JiraService);
  protected sheetsSvc = inject(SheetsService);

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
    const rd = this.store.calEvents();
    if (rd.status !== 'ok') return null;
    const now = new Date();
    return rd.data.find(e => !e.allDay && new Date(e.start) > now) ?? null;
  });

  // ── COMPUTED STATS ────────────────────────────────────────────
  unreadCount = computed(() => {
    const rd = this.store.gmailMessages();
    return rd.status === 'ok' ? rd.data.filter(m => m.unread).length : null;
  });

  todayEventsCount = computed(() => {
    const rd = this.store.calEvents();
    return rd.status === 'ok' ? rd.data.filter(e => !e.allDay).length : null;
  });

  activeTasks = computed(() => {
    const rd = this.store.realTasks();
    if (rd.status !== 'ok') return null;
    const gtCount = rd.data.filter(t => !t.done).length;
    const srd = this.store.sheetTasks();
    const stCount = srd.status === 'ok' ? srd.data.filter(t => !t.done).length : 0;
    return gtCount + stCount;
  });

  activeJira = computed(() => {
    const rd = this.store.jiraIssues();
    if (rd.status !== 'ok') return null;
    return rd.data.filter(i => {
      const s = i.status?.toLowerCase() || '';
      return s.includes('progress') || s.includes('review');
    }).length;
  });

  // ── TASK PROGRESS ─────────────────────────────────────────────
  taskProgress = computed(() => {
    const rd = this.store.realTasks();
    if (rd.status !== 'ok' || rd.data.length === 0) return null;
    const done  = rd.data.filter(t => t.done).length;
    const total = rd.data.length;
    return { done, total, pct: Math.round((done / total) * 100) };
  });

  // ── FOCUS TIME ────────────────────────────────────────────────
  totalFocusMinutes = computed(() => {
    const rd = this.store.calEvents();
    if (rd.status !== 'ok') return null;
    const slots = this.calSvc.calcFocusSlots(rd.data);
    return slots.reduce((sum, s) => sum + s.duration, 0);
  });

  // ── PREVIEW DATA ──────────────────────────────────────────────
  previewEmails = computed(() => {
    const rd = this.store.gmailMessages();
    return rd.status === 'ok' ? rd.data.slice(0, 5) : null;
  });

  previewEvents = computed(() => {
    const rd = this.store.calEvents();
    if (rd.status !== 'ok') return null;
    return rd.data
      .filter(e => !e.allDay)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  });

  previewIssues = computed(() => {
    const rd = this.store.jiraIssues();
    return rd.status === 'ok' ? rd.data.slice(0, 5) : null;
  });

  previewTasks = computed(() => {
    const rd = this.store.realTasks();
    return rd.status === 'ok' ? rd.data.filter(t => !t.done).slice(0, 5) : null;
  });

  sheetsConfigured  = computed(() => this.sheetsSvc.isConfigured());
  previewSheetTasks = computed(() => {
    const rd = this.store.sheetTasks();
    return rd.status === 'ok' ? rd.data.filter(t => !t.done).slice(0, 3) : null;
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
