import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { User } from '../models';
import { AppStore } from '../store/app.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private store = inject(AppStore);

  checkAuth(): Observable<User | null> {
    return this.http.get<User>('/api/auth/me').pipe(
      tap(user => this.store.setUser(user)),
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
