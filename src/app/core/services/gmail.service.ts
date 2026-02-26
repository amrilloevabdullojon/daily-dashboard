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

  load(pageToken?: string): Observable<{ messages: Email[]; nextPageToken: string | null }> {
    const params: Record<string, string> = {};
    if (pageToken) params['pageToken'] = pageToken;
    return this.http.get<{ messages: Email[]; nextPageToken: string | null }>(
      '/api/gmail/messages', { params }
    ).pipe(
      retry({ count: 2, delay: 1000 }),
      tap(res => {
        if (pageToken) {
          this.store.appendEmails(res.messages, res.nextPageToken);
        } else {
          this.store.setEmails(res.messages);
        }
        this._nextPageToken = res.nextPageToken;
      }),
      catchError(() => {
        if (!pageToken) this.store.setEmails([]);
        return of({ messages: [], nextPageToken: null });
      })
    );
  }

  _nextPageToken: string | null = null;

  markRead(id: string): Observable<void> {
    this.store.markEmailRead(id);
    return this.http.post<void>('/api/gmail/markread', { messageId: id }).pipe(
      catchError(() => {
        this.notif.showToast('Не удалось пометить как прочитанное', '✗');
        return this.load().pipe(map(() => void 0 as void));
      })
    );
  }

  archive(id: string): Observable<void> {
    this.store.removeEmail(id);
    return this.http.post<void>('/api/gmail/archive', { messageId: id }).pipe(
      catchError(() => {
        this.notif.showToast('Не удалось архивировать письмо', '✗');
        return this.load().pipe(map(() => void 0 as void));
      })
    );
  }

  search(query: string): Observable<Email[]> {
    const rd = this.store.gmailMessages();
    if (rd.status !== 'ok' || !query) return of([]);
    const q = query.toLowerCase();
    return of(
      rd.data.filter(m =>
        m.from.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.snippet || '').toLowerCase().includes(q)
      ).slice(0, 5)
    );
  }
}
