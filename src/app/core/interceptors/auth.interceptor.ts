import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AppStore } from '../store/app.store';
import { NotificationService } from '../services/notification.service';

// Only Google-backed endpoints should trigger session expiry on 401.
// Jira/Slack/Telegram use their own credentials — a 401 there must NOT
// clear the Google user session.
const GOOGLE_API_PATHS = ['/api/gmail/', '/api/calendar/', '/api/tasks/'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store  = inject(AppStore);
  const notif  = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isGoogleEndpoint = GOOGLE_API_PATHS.some(p => req.url.includes(p));
      if (error.status === 401 && isGoogleEndpoint) {
        store.setUser(null);
        notif.showToast('Сессия истекла — войдите снова', '🔑', 5000);
        router.navigate(['/']);
      }
      // Network error (status 0 = offline / CORS / server unreachable)
      if (error.status === 0) {
        notif.showToast('Нет соединения с сервером', '⚡', 5000);
      }
      return throwError(() => error);
    })
  );
};
