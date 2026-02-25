import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Task } from '../models';
import { AppStore } from '../store/app.store';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class SheetsService {
  private http      = inject(HttpClient);
  private store     = inject(AppStore);
  private configSvc = inject(ConfigService);

  private get spreadsheetId(): string | undefined {
    return this.configSvc.get().sheetsSpreadsheetId?.trim() || undefined;
  }

  isConfigured(): boolean {
    return !!this.spreadsheetId;
  }

  load(): Observable<Task[]> {
    const id = this.spreadsheetId;
    if (!id) {
      this.store.setSheetTasks([]);
      return of([]);
    }
    return this.http
      .get<Task[]>('/api/sheets/tasks', { params: { spreadsheetId: id } })
      .pipe(
        tap(tasks => this.store.setSheetTasks(tasks)),
        catchError(() => {
          this.store.setSheetTasks([]);
          return of([]);
        }),
      );
  }

  toggle(task: Task): Observable<{ ok: boolean }> {
    const newDone = !task.done;
    this.store.toggleSheetTaskOptimistic(task.id);
    return this.http
      .post<{ ok: boolean }>('/api/sheets/toggle', {
        spreadsheetId: task.listId,
        rowIndex:      task.rowIndex,
        done:          newDone,
      })
      .pipe(
        catchError(() => {
          // Revert optimistic update on failure
          this.store.toggleSheetTaskOptimistic(task.id);
          return of({ ok: false });
        }),
      );
  }

  create(title: string): Observable<Task | null> {
    const id = this.spreadsheetId;
    if (!id) return of(null);
    return this.http
      .post<Task>('/api/sheets/create', { spreadsheetId: id, title })
      .pipe(
        tap(task => { if (task) this.store.addSheetTask(task); }),
        catchError(() => of(null)),
      );
  }
}
