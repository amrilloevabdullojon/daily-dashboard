import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AppStore } from '../store/app.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const store = inject(AppStore);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 on internal API endpoints → user session expired
      if (error.status === 401 && req.url.startsWith('/api/') && !req.url.includes('/api/auth/')) {
        store.setUser(null);
        router.navigate(['/']);
      }
      return throwError(() => error);
    })
  );
};
