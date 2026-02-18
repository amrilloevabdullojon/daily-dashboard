import { Component, inject, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import { AppStore } from '../../core/store/app.store';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/jira':      'Jira Issues',
  '/calendar':  'Calendar',
  '/email':     'Gmail',
  '/tasks':     'Tasks',
  '/slack':     'Slack',
};

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [NgClass, DatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private store  = inject(AppStore);
  private router = inject(Router);

  currentDate = this.store.currentDate;
  isLight     = this.store.isLight;

  pageTitle = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => PAGE_TITLES[(e as NavigationEnd).urlAfterRedirects] || 'Dashboard')
    ),
    { initialValue: 'Dashboard' }
  );

  getFormattedDate(): string {
    const d = this.currentDate();
    return d.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  prevDay(): void {
    this.store.shiftDate(-1);
  }

  nextDay(): void {
    this.store.shiftDate(1);
  }

  toggleTheme(): void {
    this.store.toggleTheme();
  }

  openQuickSearch(): void {
    document.dispatchEvent(new CustomEvent('quick-search:open'));
  }

  openSettings(): void {
    document.dispatchEvent(new CustomEvent('settings:open'));
  }
}
