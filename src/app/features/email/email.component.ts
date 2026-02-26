import { Component, inject, computed, signal } from '@angular/core';
import { AppStore } from '../../core/store/app.store';
import { GmailService } from '../../core/services/gmail.service';
import { NotificationService } from '../../core/services/notification.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SmartTimePipe } from '../../shared/pipes/smart-time.pipe';

type EmailFilter = 'all' | 'unread' | 'starred';

@Component({
  selector: 'app-email',
  standalone: true,
  imports: [SkeletonLoaderComponent, SmartTimePipe],
  templateUrl: './email.component.html',
  styleUrl: './email.component.scss',
})
export class EmailComponent {
  protected store    = inject(AppStore);
  protected gmailSvc = inject(GmailService);
  private notif      = inject(NotificationService);

  filter = signal<EmailFilter>('all');
  search = signal('');

  emails = computed(() => {
    const rd = this.store.gmailMessages();
    if (rd.status !== 'ok') return null;
    let result = rd.data;
    const f = this.filter();
    if (f === 'unread')  result = result.filter(m => m.unread);
    if (f === 'starred') result = result.filter(m => m.starred);
    const q = this.search().toLowerCase();
    if (q) result = result.filter(m =>
      m.from.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q)
    );
    return result;
  });

  unreadCount = computed(() => {
    const rd = this.store.gmailMessages();
    return rd.status === 'ok' ? rd.data.filter(m => m.unread).length : 0;
  });

  hasMore  = computed(() => !!this.gmailSvc._nextPageToken);
  loading  = computed(() => this.store.gmailMessages().status === 'loading');

  searchHint = computed(() => {
    const q = this.search();
    if (!q) return null;
    const count = this.emails()?.length ?? 0;
    return count === 1 ? 'Найдено 1 письмо' : `Найдено ${count} писем`;
  });

  setFilter(f: EmailFilter): void { this.filter.set(f); }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  markRead(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.gmailSvc.markRead(id).subscribe({
      error: () => this.notif.showToast('Не удалось отметить письмо прочитанным', '✗'),
    });
  }

  archive(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.gmailSvc.archive(id).subscribe({
      error: () => this.notif.showToast('Не удалось архивировать письмо', '✗'),
    });
  }

  loadMore(): void {
    const token = this.gmailSvc._nextPageToken;
    if (token) this.gmailSvc.load(token).subscribe();
  }

  getInitial(from: string): string {
    return (from || '?').charAt(0).toUpperCase();
  }
}
