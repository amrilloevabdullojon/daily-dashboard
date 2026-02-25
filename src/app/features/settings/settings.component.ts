import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfigService } from '../../core/services/config.service';
import { AuthService } from '../../core/services/auth.service';
import { SheetsService } from '../../core/services/sheets.service';
import { AppStore } from '../../core/store/app.store';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private configSvc  = inject(ConfigService);
  private authSvc    = inject(AuthService);
  private sheetsSvc  = inject(SheetsService);
  protected store    = inject(AppStore);

  saved = signal(false);

  // Pre-populate non-sensitive fields only; tokens are never loaded into component state
  jiraDomain     = signal(this.configSvc.get().jiraDomain     || '');
  jiraEmail      = signal(this.configSvc.get().jiraEmail      || '');
  jiraProjectKey = signal(this.configSvc.get().jiraProjectKey || '');
  sheetsId       = signal(this.configSvc.get().sheetsSpreadsheetId || '');

  // Token inputs start empty; non-empty value = user wants to change the token
  jiraTokenNew  = signal('');
  slackTokenNew = signal('');

  jiraConfigured   = this.configSvc.isJiraConfigured();
  slackConfigured  = this.configSvc.isSlackConfigured();
  sheetsConfigured = this.sheetsSvc.isConfigured();

  login(): void  { this.authSvc.login(); }
  logout(): void { this.authSvc.logout(); }

  save(): void {
    const current = this.configSvc.get();
    this.configSvc.save({
      jiraDomain:          this.jiraDomain()     || current.jiraDomain,
      jiraEmail:           this.jiraEmail()      || current.jiraEmail,
      jiraProjectKey:      this.jiraProjectKey() || current.jiraProjectKey,
      sheetsSpreadsheetId: this.sheetsId().trim() || current.sheetsSpreadsheetId,
      // Only update tokens when user entered a new value; otherwise keep existing
      jiraToken:  this.jiraTokenNew().trim()  || current.jiraToken,
      slackToken: this.slackTokenNew().trim() || current.slackToken,
    });
    this.jiraConfigured   = this.configSvc.isJiraConfigured();
    this.slackConfigured  = this.configSvc.isSlackConfigured();
    this.sheetsConfigured = this.sheetsSvc.isConfigured();
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  toggleTheme(): void { this.store.toggleTheme(); }

  isLight = this.store.isLight;
}
