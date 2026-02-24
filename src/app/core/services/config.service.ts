import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AppConfig } from '../models';

const CONFIG_KEY = 'drCfg';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);

  get(): AppConfig {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') as AppConfig;
    } catch {
      return {};
    }
  }

  save(config: Partial<AppConfig>): void {
    const current = this.get();
    const merged  = { ...current, ...config };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(merged));
    // Persist sensitive tokens server-side in an httpOnly cookie
    this.http.post('/api/config/save', merged, { withCredentials: true }).pipe(
      catchError(err => { console.error('Failed to persist config cookie:', err); return of(null); })
    ).subscribe();
  }

  isJiraConfigured(): boolean {
    const cfg = this.get();
    return !!(cfg.jiraDomain && cfg.jiraEmail && cfg.jiraToken);
  }

  isSlackConfigured(): boolean {
    return !!this.get().slackToken;
  }

  /**
   * Called once on app startup. If localStorage already has Jira/Slack tokens
   * (set before the httpOnly-cookie migration), push them to the server so the
   * cookie exists before any API calls are made.
   */
  syncCookieFromStorage(): void {
    const cfg = this.get();
    if (cfg.jiraToken || cfg.slackToken) {
      this.http.post('/api/config/save', cfg, { withCredentials: true }).pipe(
        catchError(err => { console.error('Failed to sync config cookie from storage:', err); return of(null); })
      ).subscribe();
    }
  }
}
