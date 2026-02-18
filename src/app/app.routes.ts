import { Route } from '@angular/router';

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
  },
  {
    path: 'jira',
    loadComponent: () =>
      import('./features/jira/jira.component').then(m => m.JiraComponent),
    title: 'Jira',
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
    title: 'Calendar',
  },
  {
    path: 'email',
    loadComponent: () =>
      import('./features/email/email.component').then(m => m.EmailComponent),
    title: 'Gmail',
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./features/tasks/tasks.component').then(m => m.TasksComponent),
    title: 'Tasks',
  },
  {
    path: 'slack',
    loadComponent: () =>
      import('./features/slack/slack.component').then(m => m.SlackComponent),
    title: 'Slack',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(m => m.SettingsComponent),
    title: 'Настройки',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
