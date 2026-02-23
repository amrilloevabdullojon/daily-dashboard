import { Injectable } from '@angular/core';
import { AppConfig } from '../models';

const CONFIG_KEY = 'drCfg';
// Sensitive keys are stored in sessionStorage (cleared when browser closes).
// Non-sensitive settings remain in localStorage.
const SENSITIVE_KEYS: (keyof AppConfig)[] = ['jiraToken', 'slackToken', 'tgToken'];

@Injectable({ providedIn: 'root' })
export class ConfigService {
  get(): AppConfig {
    try {
      const persisted = JSON.parse(localStorage.getItem(CONFIG_KEY)  || '{}') as AppConfig;
      const session   = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}') as AppConfig;
      return { ...persisted, ...session };
    } catch {
      return {};
    }
  }

  save(config: Partial<AppConfig>): void {
    const sessionPart: Partial<AppConfig> = {};
    const persistPart: Partial<AppConfig> = {};

    for (const [key, value] of Object.entries(config) as [keyof AppConfig, unknown][]) {
      if (SENSITIVE_KEYS.includes(key as keyof AppConfig)) {
        (sessionPart as Record<string, unknown>)[key] = value;
      } else {
        (persistPart as Record<string, unknown>)[key] = value;
      }
    }

    if (Object.keys(persistPart).length > 0) {
      const current = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') as AppConfig;
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...persistPart }));
    }
    if (Object.keys(sessionPart).length > 0) {
      const current = JSON.parse(sessionStorage.getItem(CONFIG_KEY) || '{}') as AppConfig;
      sessionStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...sessionPart }));
    }
  }

  getJiraHeaders(): Record<string, string> {
    const cfg = this.get();
    if (!cfg.jiraEmail || !cfg.jiraToken) return {};
    return {
      'x-jira-domain': cfg.jiraDomain || '',
      'x-jira-email':  cfg.jiraEmail,
      'x-jira-token':  cfg.jiraToken,
    };
  }

  isJiraConfigured(): boolean {
    const cfg = this.get();
    return !!(cfg.jiraDomain && cfg.jiraEmail && cfg.jiraToken);
  }

  isSlackConfigured(): boolean {
    return !!this.get().slackToken;
  }
}
