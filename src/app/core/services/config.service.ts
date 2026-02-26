import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { AppConfig } from '../models';

const CONFIG_KEY = 'drCfg';

// Sensitive keys must NEVER be stored in localStorage — only in the httpOnly cookie.
// We store boolean "set" flags instead so isXxxConfigured() still works client-side.
const SENSITIVE_KEYS: (keyof AppConfig)[] = ['jiraToken', 'slackToken', 'tgToken'];
const FLAG_MAP: Partial<Record<keyof AppConfig, keyof AppConfig>> = {
  jiraToken:  'jiraTokenSet',
  slackToken: 'slackTokenSet',
  tgToken:    'tgTokenSet',
};

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

    // Build localStorage-safe version: strip tokens, set boolean flags
    const localSafe: AppConfig = { ...current };
    for (const key of SENSITIVE_KEYS) {
      const flagKey = FLAG_MAP[key];
      if (flagKey) {
        // If a new token was supplied, mark flag as true; otherwise preserve existing flag
        (localSafe as any)[flagKey] = !!(config[key] || current[flagKey as keyof AppConfig]);
      }
      delete localSafe[key]; // never store the token itself
    }
    // Merge non-sensitive fields
    const nonSensitive = Object.fromEntries(
      Object.entries(config).filter(([k]) => !SENSITIVE_KEYS.includes(k as keyof AppConfig))
    );
    Object.assign(localSafe, nonSensitive);

    localStorage.setItem(CONFIG_KEY, JSON.stringify(localSafe));

    // Send full config (including tokens) to the server for the httpOnly cookie
    const serverPayload = { ...localSafe, ...Object.fromEntries(
      SENSITIVE_KEYS.map(k => [k, (config[k] ?? current[k]) ?? '']).filter(([, v]) => v)
    )};
    this.http.post('/api/config/save', serverPayload, { withCredentials: true }).pipe(
      catchError(err => { console.error('Failed to persist config cookie:', err); return of(null); })
    ).subscribe();
  }

  isJiraConfigured(): boolean {
    const cfg = this.get();
    return !!(cfg.jiraDomain && cfg.jiraEmail && cfg.jiraTokenSet);
  }

  isSlackConfigured(): boolean {
    return !!this.get().slackTokenSet;
  }

  isTgConfigured(): boolean {
    return !!(this.get().tgTokenSet && this.get().tgChatId);
  }

  /**
   * Called once on app startup. If localStorage contains legacy plaintext tokens
   * (set before the httpOnly-cookie migration), push them to the server so the
   * cookie is populated, then remove them from localStorage.
   */
  syncCookieFromStorage(): void {
    const cfg = this.get();
    const hasLegacyTokens = SENSITIVE_KEYS.some(k => cfg[k]);
    if (hasLegacyTokens) {
      this.http.post('/api/config/save', cfg, { withCredentials: true }).pipe(
        catchError(err => { console.error('Failed to sync config cookie from storage:', err); return of(null); })
      ).subscribe(() => {
        // Remove raw tokens from localStorage now that the cookie is set
        const cleaned: AppConfig = { ...cfg };
        for (const key of SENSITIVE_KEYS) {
          const flagKey = FLAG_MAP[key];
          if (flagKey) (cleaned as any)[flagKey] = !!cleaned[key];
          delete cleaned[key];
        }
        localStorage.setItem(CONFIG_KEY, JSON.stringify(cleaned));
      });
    }
  }
}
