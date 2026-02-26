import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppStore, DataKey } from '../../core/store/app.store';
import { SyncService } from '../../core/services/sync.service';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  route: string;
  icon: string;
  label: string;
  dataKey?: DataKey;
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

  currentUser          = this.store.currentUser;
  syncing              = this.store.syncing;
  lastSync             = this.store.lastSync;
  integrationStatuses  = this.store.integrationStatuses;

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
      dataKey: 'jira',
      badge: () => this.store.activeJiraCount() || null,
    },
    {
      route: '/calendar',
      icon: '◷',
      label: 'Calendar',
      dataKey: 'calendar',
      badge: () => this.store.upcomingEventCount() || null,
    },
    {
      route: '/email',
      icon: '◎',
      label: 'Gmail',
      dataKey: 'gmail',
      badge: () => this.store.unreadEmailCount() || null,
    },
    {
      route: '/tasks',
      icon: '◻',
      label: 'Tasks',
      dataKey: 'tasks',
      badge: () => this.store.activeTaskCount() || null,
    },
    {
      route: '/slack',
      icon: '#',
      label: 'Slack',
      dataKey: 'slack',
      badge: () => this.store.slackUnreadCount() || null,
    },
  ];

  isUnreadBadge(item: NavItem): boolean {
    return item.route === '/email' || item.route === '/slack';
  }

  getBadge(item: NavItem): number | null {
    return item.badge ? item.badge() : null;
  }

  getStatus(item: NavItem): 'loading' | 'ok' | 'error' | null {
    if (!item.dataKey) return null;
    return this.integrationStatuses()[item.dataKey];
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
