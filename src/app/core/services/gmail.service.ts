import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map, retry } from 'rxjs';
import { Email } from '../models';
import { AppStore } from '../store/app.store';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class GmailService {
  private http  = inject(HttpClient);
  private store = inject(AppStore);
  private notif = inject(NotificationService);

  load(): Observable<Email[]> {
    return this.http.get<Email[]>('/api/gmail/messages').pipe(
      retry({ count: 2, delay: 1000 }),
      tap(msgs => this.store.setEmails(msgs)),
      catchError(() => {
        this.store.setEmails([]);
        return of([]);
      })
    );
  }

  markRead(id: string): Observable<void> {
    // Optimistic update first
    this.store.markEmailRead(id);
    return this.http.post<void>('/api/gmail/markread', { messageId: id }).pipe(
      catchError(() => {
        // Chain reload in the observable instead of calling subscribe() to avoid dangling subscriptions
        this.notif.showToast('Не удалось пометить как прочитанное', '✗');
        return this.load().pipe(map(() => void 0 as void));
      })
    );
  }

  archive(id: string): Observable<void> {
    // Optimistic remove
    this.store.removeEmail(id);
    return this.http.post<void>('/api/gmail/archive', { messageId: id }).pipe(
      catchError(() => {
        this.notif.showToast('Не удалось архивировать письмо', '✗');
        return this.load().pipe(map(() => void 0 as void));
      })
    );
  }

  search(query: string): Observable<Email[]> {
    const msgs = this.store.gmailMessages();
    if (!Array.isArray(msgs) || !query) return of([]);
    const q = query.toLowerCase();
    return of(
      msgs.filter(m =>
        m.from.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.snippet || '').toLowerCase().includes(q)
      ).slice(0, 5)
    );
  }
}
