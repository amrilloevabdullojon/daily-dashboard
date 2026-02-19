import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { User } from '../models';
import { AppStore } from '../store/app.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private store = inject(AppStore);

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
    // Clear cookie by calling logout endpoint
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      this.store.setUser(null);
      window.location.reload();
    });
  }

  isAuthenticated(): boolean {
    return this.store.currentUser() !== null;
  }
}
