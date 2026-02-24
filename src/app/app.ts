import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { AuthService } from './core/services/auth.service';
import { SyncService } from './core/services/sync.service';
import { HotkeysService } from './core/services/hotkeys.service';
import { NotificationService } from './core/services/notification.service';
import { AppStore } from './core/store/app.store';
import { NgClass, DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, NgClass, DatePipe],
  template: `
    <div class="app" [ngClass]="{ 'light': store.isLight() }">
      <app-sidebar />
      <div class="main">
        <app-topbar />
        <div class="content fade-in">
          <router-outlet />
        </div>
      </div>
    </div>

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
  `]
})
export class App implements OnInit {
  protected store    = inject(AppStore);
  protected notif    = inject(NotificationService);
  private auth       = inject(AuthService);
  private sync       = inject(SyncService);
  private hotkeys    = inject(HotkeysService);

  ngOnInit(): void {
    // Restore theme
    const savedTheme = localStorage.getItem('drTheme');
    if (savedTheme === 'light') {
      this.store.toggleTheme();
    }

    // Init hotkeys
    this.hotkeys.init();

    // Check auth, then always start auto-refresh
    // If not authorized - services will return empty arrays (handled by catchError)
    this.auth.checkAuth().subscribe(() => {
      this.sync.startAutoRefresh();
    });
  }
}
