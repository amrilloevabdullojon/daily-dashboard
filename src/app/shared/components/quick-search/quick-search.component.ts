import {
  Component, inject, signal, computed, HostListener, ElementRef, ViewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '../../../core/store/app.store';
import { Email, Task, JiraIssue, CalEvent } from '../../../core/models'; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface SearchResult {
  type: 'email' | 'task' | 'jira' | 'event';
  icon: string;
  title: string;
  sub: string;
  action: () => void;
}

@Component({
  selector: 'app-quick-search',
  standalone: true,
  templateUrl: './quick-search.component.html',
  styleUrl: './quick-search.component.scss',
})
export class QuickSearchComponent {
  private store  = inject(AppStore);
  private router = inject(Router);

  open    = signal(false);
  query   = signal('');
  cursor  = signal(0);

  @ViewChild('searchInput') inputRef!: ElementRef<HTMLInputElement>;

  @HostListener('document:quick-search:open')
  onOpen(): void {
    this.open.set(true);
    this.query.set('');
    this.cursor.set(0);
    setTimeout(() => this.inputRef?.nativeElement?.focus(), 50);
  }

  close(): void { this.open.set(false); }

  onInput(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
    this.cursor.set(0);
  }

  results = computed((): SearchResult[] => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    // Emails
    const msgRd = this.store.gmailMessages();
    if (msgRd.status === 'ok') {
      msgRd.data
        .filter(m => m.from.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach(m => out.push({
          type: 'email', icon: '◎',
          title: m.subject,
          sub: m.from,
          action: () => { this.router.navigate(['/email']); this.close(); }
        }));
    }

    // Tasks
    const taskRd = this.store.realTasks();
    if (taskRd.status === 'ok') {
      taskRd.data
        .filter(t => !t.done && t.title.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach(t => out.push({
          type: 'task', icon: '◻',
          title: t.title,
          sub: t.due || 'Без срока',
          action: () => { this.router.navigate(['/tasks']); this.close(); }
        }));
    }

    // Jira issues
    const jiraRd = this.store.jiraIssues();
    if (jiraRd.status === 'ok') {
      jiraRd.data
        .filter(i => i.key.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach(i => out.push({
          type: 'jira', icon: '◉',
          title: `${i.key} — ${i.summary}`,
          sub: `${i.status} · ${i.project}`,
          action: () => { window.open(i.url, '_blank'); this.close(); }
        }));
    }

    // Calendar events
    const calRd = this.store.calEvents();
    if (calRd.status === 'ok') {
      calRd.data
        .filter(e => e.title.toLowerCase().includes(q))
        .slice(0, 3)
        .forEach(e => out.push({
          type: 'event', icon: '◷',
          title: e.title,
          sub: new Date(e.start).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          action: () => { this.router.navigate(['/calendar']); this.close(); }
        }));
    }

    return out;
  });

  select(r: SearchResult): void { r.action(); }

  onKeydown(e: KeyboardEvent): void {
    const len = this.results().length;
    if (e.key === 'Escape')    { this.close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.cursor.set((this.cursor() + 1) % Math.max(len, 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); this.cursor.set((this.cursor() - 1 + Math.max(len, 1)) % Math.max(len, 1)); }
    if (e.key === 'Enter' && len > 0) { this.results()[this.cursor()]?.action(); this.close(); }
  }
}
