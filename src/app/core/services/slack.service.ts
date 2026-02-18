import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { SlackData, SlackError } from '../models';
import { AppStore } from '../store/app.store';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class SlackService {
  private http = inject(HttpClient);
  private store = inject(AppStore);
  private config = inject(ConfigService);

  load(): Observable<SlackData | SlackError> {
    if (!this.config.isSlackConfigured()) {
      const empty = {};
      this.store.setSlackData(empty);
      return of(empty as any);
    }

    const token = this.config.get().slackToken;
    const headers = { 'x-slack-token': token! };

    return this.http.get<SlackData | SlackError>('/api/slack/messages', { headers }).pipe(
      tap(data => {
        if (!data || !(data as SlackData).ok) {
          this.store.setSlackData({ ok: false, error: (data as SlackError).error || 'unknown' } as SlackError);
        } else {
          this.store.setSlackData(data);
        }
      }),
      catchError((err) => {
        const error: SlackError = { ok: false, error: `http_${err.status || 'network'}` };
        this.store.setSlackData(error);
        return of(error);
      })
    );
  }

  sendMessage(channel: string, text: string): Observable<{ ok: boolean; ts?: string }> {
    const token = this.config.get().slackToken;
    const headers = { 'x-slack-token': token! };
    return this.http.post<{ ok: boolean; ts?: string }>('/api/slack/send', { channel, text }, { headers });
  }

  getErrorHint(errorCode: string): string {
    const hints: Record<string, string> = {
      'invalid_auth':    'Токен неверный или отозван. Создайте новый Bot Token на api.slack.com',
      'missing_scope':   'Не хватает прав у Bot Token. Добавьте scopes: channels:history, im:history, im:read, users:read, chat:write',
      'not_in_channel':  'Бот не добавлен в каналы. Используйте /invite @yourbot',
      'token_revoked':   'Токен отозван. Создайте новый Bot Token',
      'account_inactive':'Аккаунт неактивен',
    };
    return hints[errorCode] || 'Проверьте токен и права приложения в api.slack.com';
  }
}
