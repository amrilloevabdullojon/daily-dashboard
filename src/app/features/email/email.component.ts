import { Component, inject, computed, signal } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { AppStore } from '../../core/store/app.store';
import { GmailService } from '../../core/services/gmail.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SmartTimePipe } from '../../shared/pipes/smart-time.pipe';

type EmailFilter = 'all' | 'unread' | 'starred';

@Component({
  selector: 'app-email',
  standalone: true,
  imports: [NgClass, NgFor, NgIf, SkeletonLoaderComponent, SmartTimePipe],
  templateUrl: './email.component.html',
  styleUrl: './email.component.scss',
})
export class EmailComponent {
  protected store    = inject(AppStore);
  protected gmailSvc = inject(GmailService);

  filter = signal<EmailFilter>('all');
  search = signal('');

  emails = computed(() => {
    const msgs = this.store.gmailMessages();
    if (!Array.isArray(msgs)) return null;
    let result = msgs;
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
    const msgs = this.store.gmailMessages();
    return Array.isArray(msgs) ? msgs.filter(m => m.unread).length : 0;
  });

  setFilter(f: EmailFilter): void { this.filter.set(f); }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  markRead(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.gmailSvc.markRead(id).subscribe();
  }

  archive(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.gmailSvc.archive(id).subscribe();
  }

  getInitial(from: string): string {
    return (from || '?').charAt(0).toUpperCase();
  }
}
