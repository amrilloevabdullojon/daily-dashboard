import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { JiraIssue } from '../models';
import { AppStore } from '../store/app.store';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class JiraService {
  private http = inject(HttpClient);
  private store = inject(AppStore);
  private config = inject(ConfigService);

  load(): Observable<JiraIssue[]> {
    if (!this.config.isJiraConfigured()) {
      this.store.setJiraIssues([]);
      return of([]);
    }

    const headers = this.config.getJiraHeaders();
    return this.http.get<JiraIssue[]>('/api/jira/issues', { headers }).pipe(
      tap(issues => this.store.setJiraIssues(issues)),
      catchError(() => {
        this.store.setJiraIssues([]);
        return of([]);
      })
    );
  }

  createIssue(data: {
    summary: string;
    description?: string;
    priority?: string;
    type?: string;
  }): Observable<JiraIssue> {
    const headers = this.config.getJiraHeaders();
    return this.http.post<JiraIssue>('/api/jira/create', data, { headers });
  }

  search(query: string): Observable<JiraIssue[]> {
    const issues = this.store.jiraIssues();
    if (!Array.isArray(issues) || !query) return of([]);
    const q = query.toLowerCase();
    return of(
      issues.filter(i =>
        i.key.toLowerCase().includes(q) ||
        i.summary.toLowerCase().includes(q)
      ).slice(0, 5)
    );
  }

  // Helper methods (previously standalone functions)
  priorityClass(priority: string): string {
    const p = priority?.toLowerCase() || '';
    if (p.includes('high') || p.includes('critical') || p.includes('blocker')) return 'p-high';
    if (p.includes('medium') || p.includes('normal') || p.includes('major')) return 'p-medium';
    return 'p-low';
  }

  statusClass(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('progress') || s.includes('dev')) return 'status-progress';
    if (s.includes('review') || s.includes('testing')) return 'status-review';
    if (s.includes('approval') || s.includes('approv')) return 'status-approval';
    if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'status-done';
    return 'status-todo';
  }

  statusGroup(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s.includes('progress') || s.includes('dev')) return 'in_progress';
    if (s.includes('review') || s.includes('test')) return 'review';
    if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'done';
    return 'todo';
  }
}
