import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Email } from '../models';
import { AppStore } from '../store/app.store';

@Injectable({ providedIn: 'root' })
export class GmailService {
  private http = inject(HttpClient);
  private store = inject(AppStore);

  load(): Observable<Email[]> {
    return this.http.get<Email[]>('/api/gmail/messages').pipe(
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
    return this.http.post<void>('/api/gmail/markread', { id }).pipe(
      catchError(() => {
        // Revert on failure — reload data
        this.load().subscribe();
        return of(void 0);
      })
    );
  }

  archive(id: string): Observable<void> {
    // Optimistic remove
    this.store.removeEmail(id);
    return this.http.post<void>('/api/gmail/archive', { id }).pipe(
      catchError(() => {
        this.load().subscribe();
        return of(void 0);
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
