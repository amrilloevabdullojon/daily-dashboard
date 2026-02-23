import { Route } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Dashboard',
    canActivate: [authGuard],
  },
  {
    path: 'jira',
    loadComponent: () =>
      import('./features/jira/jira.component').then(m => m.JiraComponent),
    title: 'Jira',
    canActivate: [authGuard],
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
    title: 'Calendar',
    canActivate: [authGuard],
  },
  {
    path: 'email',
    loadComponent: () =>
      import('./features/email/email.component').then(m => m.EmailComponent),
    title: 'Gmail',
    canActivate: [authGuard],
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./features/tasks/tasks.component').then(m => m.TasksComponent),
    title: 'Tasks',
    canActivate: [authGuard],
  },
  {
    path: 'slack',
    loadComponent: () =>
      import('./features/slack/slack.component').then(m => m.SlackComponent),
    title: 'Slack',
    canActivate: [authGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Настройки',
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
