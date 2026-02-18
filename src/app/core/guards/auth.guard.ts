import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppStore } from '../store/app.store';

export const authGuard: CanActivateFn = () => {
  const store = inject(AppStore);
  const router = inject(Router);

  if (store.currentUser()) return true;

  router.navigate(['/']);
  return false;
};
