import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { User } from '../models';
import { AppStore } from '../store/app.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private store  = inject(AppStore);
  private router = inject(Router);

  checkAuth(): Observable<User | null> {
    return this.http.get<any>('/api/auth/me').pipe(
      tap(resp => {
        // /api/auth/me returns HTTP 200 in both cases:
        // { authenticated: true, name, email, picture } — logged in
        // { authenticated: false }                     — not logged in
        if (resp?.authenticated && resp.name) {
          this.store.setUser({ name: resp.name, email: resp.email, picture: resp.picture });
        } else {
          this.store.setUser(null);
        }
      }),
      map(resp => resp?.authenticated ? (resp as User) : null),
      catchError(() => {
        this.store.setUser(null);
        return of(null);
      })
    );
  }

  login(): void {
    window.location.href = '/api/auth/google';
  }

  logout(): void {
    this.http.post('/api/auth/logout', {}).subscribe({
      next: () => {
        this.store.setUser(null);
        this.router.navigate(['/']);
      },
      error: () => {
        // Even if the server call fails, clear local state
        this.store.setUser(null);
        this.router.navigate(['/']);
      },
    });
  }

  isAuthenticated(): boolean {
    return this.store.currentUser() !== null;
  }
}
