import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, filter } from 'rxjs';
import { Router } from '@angular/router';
import { SyncService } from './sync.service';

@Injectable({ providedIn: 'root' })
export class HotkeysService {
  private router    = inject(Router);
  private sync      = inject(SyncService);
  private destroyRef = inject(DestroyRef);

  private gPressed = false;
  private gTimer: ReturnType<typeof setTimeout> | null = null;

  readonly NAV_KEYS: Record<string, string> = {
    'd': '/dashboard',
    'j': '/jira',
    'c': '/calendar',
    'm': '/email',
    't': '/tasks',
    's': '/slack',
  };

  init(): void {
    fromEvent<KeyboardEvent>(document, 'keydown').pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(e => this.handleKey(e));
  }

  private handleKey(e: KeyboardEvent): void {
    // Skip if typing in input/textarea
    const tag = (e.target as HTMLElement).tagName;
    const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

    // Ctrl+K → Quick Search
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('quick-search:open'));
      return;
    }

    if (isInput) return;

    // R → Sync
    if (e.key === 'r' || e.key === 'R') {
      this.sync.syncAll();
      return;
    }

    // G then letter → navigate
    if (e.key === 'g' || e.key === 'G') {
      this.gPressed = true;
      if (this.gTimer) clearTimeout(this.gTimer);
      this.gTimer = setTimeout(() => { this.gPressed = false; }, 1500);
      return;
    }

    if (this.gPressed) {
      const route = this.NAV_KEYS[e.key.toLowerCase()];
      if (route) {
        this.router.navigate([route]);
        this.gPressed = false;
      }
    }
  }
}
