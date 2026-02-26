import { Component, inject, computed, signal } from '@angular/core';
import { AppStore } from '../../core/store/app.store';
import { SlackService } from '../../core/services/slack.service';
import { NotificationService } from '../../core/services/notification.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SmartTimePipe } from '../../shared/pipes/smart-time.pipe';
import { ConfigService } from '../../core/services/config.service';
import { SlackData, SlackError } from '../../core/models';

type SlackFilter = 'all' | 'dms' | 'mentions' | 'unreads';

@Component({
  selector: 'app-slack',
  standalone: true,
  imports: [SkeletonLoaderComponent, SmartTimePipe],
  templateUrl: './slack.component.html',
  styleUrl: './slack.component.scss',
})
export class SlackComponent {
  protected store    = inject(AppStore);
  protected slackSvc = inject(SlackService);
  private config     = inject(ConfigService);
  private notif      = inject(NotificationService);

  filter       = signal<SlackFilter>('all');
  replyChannel = signal<string | null>(null);
  messageText  = signal('');

  isConfigured = computed(() => this.config.isSlackConfigured());
  isLoading    = computed(() => this.store.slackData().status === 'loading' && this.isConfigured());

  slackData = computed((): SlackData | null => {
    const rd = this.store.slackData();
    if (rd.status !== 'ok') return null;
    const d = rd.data as any;
    return d?.ok === true ? (d as SlackData) : null;
  });

  slackError = computed((): SlackError | null => {
    const rd = this.store.slackData();
    if (rd.status !== 'ok') return null;
    const d = rd.data as any;
    return d?.ok === false ? (d as SlackError) : null;
  });

  messages = computed(() => {
    const d = this.slackData();
    if (!d) return [];
    const f = this.filter();
    if (f === 'dms')      return d.dms || [];
    if (f === 'mentions') return d.mentions || [];
    if (f === 'unreads')  return d.unreads || [];
    return [...(d.dms || []), ...(d.mentions || []), ...(d.unreads || [])];
  });

  errorHint = computed(() => {
    const e = this.slackError();
    return e ? this.slackSvc.getErrorHint(e.error) : '';
  });

  setFilter(f: SlackFilter): void { this.filter.set(f); }

  sendMessage(): void {
    const channel = this.replyChannel();
    const text = this.messageText().trim();
    if (!channel || !text) return;
    this.slackSvc.sendMessage(channel, text).subscribe({
      next:  () => { this.messageText.set(''); this.notif.showToast('Сообщение отправлено', '✓'); },
      error: () => this.notif.showToast('Не удалось отправить сообщение', '✗'),
    });
  }

  onTextInput(event: Event): void {
    this.messageText.set((event.target as HTMLInputElement).value);
  }
}
