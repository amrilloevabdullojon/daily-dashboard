import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../core/services/config.service';
import { AuthService } from '../../core/services/auth.service';
import { AppStore } from '../../core/store/app.store';
import { AppConfig } from '../../core/models';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private configSvc = inject(ConfigService);
  private authSvc   = inject(AuthService);
  protected store   = inject(AppStore);

  saved = signal(false);

  cfg: AppConfig = this.configSvc.get();

  login(): void {
    this.authSvc.login();
  }

  logout(): void {
    this.authSvc.logout();
  }

  save(): void {
    this.configSvc.save(this.cfg);
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  toggleTheme(): void {
    this.store.toggleTheme();
  }

  isLight = this.store.isLight;
}
