import { Component, inject, computed, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppStore } from '../../core/store/app.store';
import { JiraService } from '../../core/services/jira.service';
import { NotificationService } from '../../core/services/notification.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { StatusTypePipe } from '../../shared/pipes/status-label.pipe';
import { ConfigService } from '../../core/services/config.service';

type JiraTab = 'all' | 'in_progress' | 'review' | 'todo' | 'done';

@Component({
  selector: 'app-jira',
  standalone: true,
  imports: [SkeletonLoaderComponent, StatusPillComponent, StatusTypePipe],
  templateUrl: './jira.component.html',
  styleUrl: './jira.component.scss',
})
export class JiraComponent {
  protected store    = inject(AppStore);
  protected jiraSvc  = inject(JiraService);
  protected notif    = inject(NotificationService);
  private config     = inject(ConfigService);
  private destroyRef = inject(DestroyRef);

  tab = signal<JiraTab>('all');
  showCreate = signal(false);
  createSummary = signal('');
  createPriority = signal('Medium');
  creating = signal(false);

  issues = computed(() => {
    const rd = this.store.jiraIssues();
    return rd.status === 'ok' ? rd.data : null;
  });

  filtered = computed(() => {
    const all = this.issues();
    if (!all) return null;
    const t = this.tab();
    if (t === 'all') return all;
    return all.filter(i => this.jiraSvc.statusGroup(i.status) === t);
  });

  isConfigured = computed(() => this.config.isJiraConfigured());
  isLoading    = computed(() => this.store.jiraIssues().status === 'loading');
  hasMore      = computed(() => {
    const rd = this.store.jiraIssues();
    const loaded = rd.status === 'ok' ? rd.data.length : 0;
    return loaded > 0 && loaded < this.jiraSvc._jiraTotal;
  });

  tabCounts = computed(() => {
    const all = this.issues();
    if (!all) return {} as Record<JiraTab, number>;
    return {
      all:         all.length,
      in_progress: all.filter(i => this.jiraSvc.statusGroup(i.status) === 'in_progress').length,
      review:      all.filter(i => this.jiraSvc.statusGroup(i.status) === 'review').length,
      todo:        all.filter(i => this.jiraSvc.statusGroup(i.status) === 'todo').length,
      done:        all.filter(i => this.jiraSvc.statusGroup(i.status) === 'done').length,
    } as Record<JiraTab, number>;
  });

  setTab(t: JiraTab): void { this.tab.set(t); }
  openIssue(url: string): void { window.open(url, '_blank'); }

  loadMore(): void {
    const rd = this.store.jiraIssues();
    const startAt = rd.status === 'ok' ? rd.data.length : 0;
    this.jiraSvc.load(startAt).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  submitCreate(): void {
    const summary = this.createSummary().trim();
    if (!summary || this.creating()) return;
    this.creating.set(true);
    this.jiraSvc.createIssue({ summary, priority: this.createPriority() }).subscribe({
      next: () => {
        this.notif.showToast('Задача создана в Jira');
        this.showCreate.set(false);
        this.createSummary.set('');
        this.creating.set(false);
        this.jiraSvc.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
      },
      error: () => {
        this.notif.showToast('Ошибка создания задачи');
        this.creating.set(false);
      },
    });
  }

  onSummaryInput(event: Event): void {
    this.createSummary.set((event.target as HTMLInputElement).value);
  }
}
