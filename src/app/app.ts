import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { AuthService } from './core/services/auth.service';
import { SyncService } from './core/services/sync.service';
import { HotkeysService } from './core/services/hotkeys.service';
import { NotificationService } from './core/services/notification.service';
import { ConfigService } from './core/services/config.service';
import { AppStore } from './core/store/app.store';
import { NgClass, DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, NgClass, DatePipe],
  template: `
    @if (authChecked()) {
      <div class="app" [ngClass]="{ 'light': store.isLight() }">
        <app-sidebar />
        <div class="main">
          <app-topbar />
          <div class="content fade-in">
            <router-outlet />
          </div>
        </div>
      </div>
    } @else {
      <div class="app-loading" [ngClass]="{ 'light': store.isLight() }">
        <div class="app-loading-inner">
          <div class="app-loading-dot"></div>
          <div class="app-loading-dot"></div>
          <div class="app-loading-dot"></div>
        </div>
      </div>
    }

    <!-- Toast notifications -->
    @if (notif.toasts().length) {
      <div class="toast-container">
        @for (toast of notif.toasts(); track toast.id) {
          <div class="toast" (click)="notif.dismissToast(toast.id)">
            <span class="toast-icon">{{ toast.icon }}</span>
            <span class="toast-msg">{{ toast.message }}</span>
          </div>
        }
      </div>
    }

    <!-- Hotkeys help panel -->
    @if (showHotkeys()) {
      <div class="hotkeys-overlay" (click)="showHotkeys.set(false)" role="dialog" aria-modal="true" aria-label="Горячие клавиши">
        <div class="hotkeys-panel" (click)="$event.stopPropagation()">
          <div class="hotkeys-title">Горячие клавиши <span class="hotkeys-close" (click)="showHotkeys.set(false)" tabindex="0" role="button" aria-label="Закрыть">✕</span></div>
          <div class="hotkeys-grid">
            <div class="hotkeys-group">
              <div class="hotkeys-group-title">Навигация (G + ...)</div>
              @for (item of NAV_HOTKEYS; track item.key) {
                <div class="hotkey-row"><kbd>G</kbd><kbd>{{ item.key }}</kbd><span>{{ item.label }}</span></div>
              }
            </div>
            <div class="hotkeys-group">
              <div class="hotkeys-group-title">Действия</div>
              <div class="hotkey-row"><kbd>R</kbd><span>Обновить данные</span></div>
              <div class="hotkey-row"><kbd>Ctrl</kbd><kbd>K</kbd><span>Быстрый поиск</span></div>
              <div class="hotkey-row"><kbd>?</kbd><span>Эта панель</span></div>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Meeting alert -->
    @if (notif.meetingAlert(); as alert) {
      <div class="meeting-alert">
        <div class="alert-header">
          <span>🔔</span>
          <span>Встреча через {{ alert.minsLeft }} мин</span>
        </div>
        <div class="alert-title">{{ alert.event.title }}</div>
        <div class="alert-meta">
          <span>{{ alert.event.start | date:'HH:mm' }}</span>
          @if (alert.event.location) {
            <span>· {{ alert.event.location }}</span>
          }
        </div>
        <div class="alert-actions">
          <button class="alert-btn" (click)="notif.dismissMeetingAlert()">Закрыть</button>
          @if (alert.event.hangoutLink) {
            <a class="alert-btn alert-btn-join" [href]="alert.event.hangoutLink" target="_blank" rel="noopener">
              Подключиться
            </a>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .app-loading {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
    }
    .app-loading-inner {
      display: flex;
      gap: 8px;
    }
    .app-loading-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
      animation: pulse 1.2s ease-in-out infinite;
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
    .hotkeys-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      animation: fadeIn .15s ease;
    }
    .hotkeys-panel {
      background: var(--bg2); border: 1px solid var(--border); border-radius: 16px;
      padding: 24px; min-width: 400px; max-width: 520px; width: 90%;
    }
    .hotkeys-title {
      font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 20px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .hotkeys-close { cursor: pointer; color: var(--muted); font-size: 12px; padding: 4px 6px; border-radius: 4px; &:hover { color: var(--text); background: var(--bg3); } }
    .hotkeys-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .hotkeys-group-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin-bottom: 10px; }
    .hotkey-row { display: flex; align-items: center; gap: 6px; padding: 5px 0; font-size: 12px; color: var(--text2); }
    .hotkey-row span { margin-left: 4px; }
    kbd { background: var(--bg3); border: 1px solid var(--border2); border-radius: 4px; padding: 2px 7px; font-size: 11px; font-family: var(--font-mono); color: var(--text); min-width: 24px; text-align: center; }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  `]
})
export class App implements OnInit {
  protected store       = inject(AppStore);
  protected notif       = inject(NotificationService);
  protected authChecked = signal(false);
  protected showHotkeys = signal(false);
  private auth          = inject(AuthService);
  private sync          = inject(SyncService);
  private hotkeys       = inject(HotkeysService);
  private config        = inject(ConfigService);

  readonly NAV_HOTKEYS = [
    { key: 'D', label: 'Dashboard' },
    { key: 'J', label: 'Jira' },
    { key: 'C', label: 'Calendar' },
    { key: 'M', label: 'Gmail' },
    { key: 'T', label: 'Tasks' },
    { key: 'S', label: 'Slack' },
  ];

  @HostListener('document:hotkeys:show')
  onShowHotkeys(): void { this.showHotkeys.set(true); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.showHotkeys.set(false); }

  ngOnInit(): void {
    // Restore theme
    const savedTheme = localStorage.getItem('drTheme');
    if (savedTheme === 'light') {
      this.store.toggleTheme();
    }

    // Init hotkeys
    this.hotkeys.init();

    // Migrate tokens from localStorage → httpOnly cookie (once per session)
    this.config.syncCookieFromStorage();

    // Check auth, then always start auto-refresh
    // If not authorized - services will return empty arrays (handled by catchError)
    this.auth.checkAuth().subscribe({
      next:     () => { this.authChecked.set(true); this.sync.startAutoRefresh(); },
      error:    () => this.authChecked.set(true),
      complete: () => this.authChecked.set(true),
    });
  }
}
