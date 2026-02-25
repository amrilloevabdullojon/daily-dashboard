import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Task } from '../models';
import { AppStore } from '../store/app.store';
import { ConfigService } from './config.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class SheetsService {
  private http      = inject(HttpClient);
  private store     = inject(AppStore);
  private configSvc = inject(ConfigService);
  private notif     = inject(NotificationService);

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
        tap(tasks => { this.store.setSheetTasks(tasks); this.store.clearDataError('sheets'); }),
        catchError(() => {
          this.store.setSheetTasks([]);
          this.store.setDataError('sheets', 'Не удалось загрузить задачи из Sheets');
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

  delete(task: Task): Observable<void> {
    this.store.removeSheetTask(task.id);
    return this.http
      .post<void>('/api/sheets/delete', { spreadsheetId: task.listId, rowIndex: task.rowIndex })
      .pipe(
        catchError(() => {
          this.store.addSheetTask(task);
          this.notif.showToast('Не удалось удалить задачу', '✗');
          return of(void 0);
        }),
      );
  }
}
