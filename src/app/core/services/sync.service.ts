import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer, switchMap, forkJoin } from 'rxjs';
import { GmailService } from './gmail.service';
import { CalendarService } from './calendar.service';
import { TasksService } from './tasks.service';
import { JiraService } from './jira.service';
import { SlackService } from './slack.service';
import { AppStore } from '../store/app.store';

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
export class SyncService {
  private gmail    = inject(GmailService);
  private calendar = inject(CalendarService);
  private tasks    = inject(TasksService);
  private jira     = inject(JiraService);
  private slack    = inject(SlackService);
  private store    = inject(AppStore);
  private destroyRef = inject(DestroyRef);

  /** Single sync of all data sources in parallel */
  syncAll() {
    this.store.setSyncing(true);

    forkJoin({
      emails: this.gmail.load(),
      events: this.calendar.load(),
      tasks:  this.tasks.load(),
      jira:   this.jira.load(),
      slack:  this.slack.load(),
    }).subscribe({
      next:  () => this.store.setSynced(),
      error: () => this.store.setSynced(),
    });
  }

  /** Start auto-refresh timer (call once from AppComponent) */
  startAutoRefresh(): void {
    timer(0, AUTO_REFRESH_MS).pipe(
      switchMap(() => forkJoin({
        emails: this.gmail.load(),
        events: this.calendar.load(),
        tasks:  this.tasks.load(),
        jira:   this.jira.load(),
        slack:  this.slack.load(),
      })),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next:  () => this.store.setSynced(),
      error: () => this.store.setSynced(),
    });
  }
}
