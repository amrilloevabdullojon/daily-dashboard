import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStore } from '../../core/store/app.store';
import { SyncService } from '../../core/services/sync.service';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  route: string;
  icon: string;
  label: string;
  badge?: () => number | null;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private store = inject(AppStore);
  private sync  = inject(SyncService);
  private auth  = inject(AuthService);

  currentUser = this.store.currentUser;
  syncing     = this.store.syncing;
  lastSync    = this.store.lastSync;

  navItems: NavItem[] = [
    {
      route: '/dashboard',
      icon: '◈',
      label: 'Dashboard',
    },
    {
      route: '/jira',
      icon: '◉',
      label: 'Jira',
      badge: () => {
        const issues = this.store.jiraIssues();
        if (!Array.isArray(issues)) return null;
        return issues.filter(i => {
          const s = i.status?.toLowerCase() || '';
          return s.includes('progress') || s.includes('review');
        }).length || null;
      },
    },
    {
      route: '/calendar',
      icon: '◷',
      label: 'Calendar',
      badge: () => {
        const events = this.store.calEvents();
        if (!Array.isArray(events)) return null;
        const now = new Date();
        const upcoming = events.filter(e => !e.allDay && new Date(e.start) > now).length;
        return upcoming || null;
      },
    },
    {
      route: '/email',
      icon: '◎',
      label: 'Gmail',
      badge: () => {
        const msgs = this.store.gmailMessages();
        if (!Array.isArray(msgs)) return null;
        const unread = msgs.filter(m => m.unread).length;
        return unread || null;
      },
    },
    {
      route: '/tasks',
      icon: '◻',
      label: 'Tasks',
      badge: () => {
        const tasks = this.store.realTasks();
        if (!Array.isArray(tasks)) return null;
        const active = tasks.filter(t => !t.done).length;
        return active || null;
      },
    },
  ];

  isUnreadBadge(item: NavItem): boolean {
    return item.route === '/email';
  }

  getBadge(item: NavItem): number | null {
    return item.badge ? item.badge() : null;
  }

  getLastSyncLabel(): string {
    const sync = this.lastSync();
    if (!sync) return '';
    const diff = Math.round((Date.now() - sync.getTime()) / 60000);
    if (diff < 1) return 'Только что';
    if (diff < 60) return `${diff} мин назад`;
    return 'Давно';
  }

  syncAll(): void {
    this.sync.syncAll();
  }

  login(): void {
    this.auth.login();
  }

  getUserInitial(): string {
    const user = this.currentUser();
    if (!user?.name) return '?';
    return user.name.charAt(0).toUpperCase();
  }
}
