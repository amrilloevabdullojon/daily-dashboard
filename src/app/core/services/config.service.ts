import { Injectable } from '@angular/core';
import { AppConfig } from '../models';

const CONFIG_KEY = 'drCfg';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  get(): AppConfig {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') as AppConfig;
    } catch {
      return {};
    }
  }

  save(config: Partial<AppConfig>): void {
    const current = this.get();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
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
