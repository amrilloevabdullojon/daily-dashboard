import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { AuthService } from './core/services/auth.service';
import { SyncService } from './core/services/sync.service';
import { HotkeysService } from './core/services/hotkeys.service';
import { AppStore } from './core/store/app.store';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, NgClass],
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
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class App implements OnInit {
  protected store    = inject(AppStore);
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

    // Check auth, then start auto-refresh
    this.auth.checkAuth().subscribe(user => {
      if (user) {
        this.sync.startAutoRefresh();
      }
    });
  }
}
