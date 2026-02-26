import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, retry } from 'rxjs';
import { Task } from '../models';
import { AppStore } from '../store/app.store';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http  = inject(HttpClient);
  private store = inject(AppStore);
  private notif = inject(NotificationService);

  load(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks/list').pipe(
      retry({ count: 2, delay: 1000 }),
      tap(tasks => { this.store.setTasks(tasks); this.store.clearDataError('tasks'); }),
      catchError(() => {
        this.store.setTasks([]);
        this.store.setDataError('tasks', 'Не удалось загрузить задачи');
        return of([]);
      })
    );
  }

  toggle(task: Task): Observable<void> {
    // Optimistic update
    this.store.toggleTaskOptimistic(task.id);
    return this.http.post<void>('/api/tasks/toggle', {
      taskId: task.id,
      listId: task.listId,
      status: task.done ? 'needsAction' : 'completed',
    }).pipe(
      catchError(() => {
        this.store.toggleTaskOptimistic(task.id);
        this.notif.showToast('Не удалось изменить задачу', '✗');
        return of(void 0);
      })
    );
  }

  create(title: string, due?: string): Observable<Task> {
    // Optimistic add
    const tempTask: Task = {
      id: `temp-${crypto.randomUUID()}`,
      listId: '',
      title,
      done: false,
      due: due || '',
    };
    this.store.addTask(tempTask);

    return this.http.post<Task>('/api/tasks/create', { title, due }).pipe(
      tap(created => {
        const rd = this.store.realTasks();
        if (rd.status !== 'ok') return;
        this.store.setTasks(rd.data.map(t => t.id === tempTask.id ? created : t));
      }),
      catchError(() => {
        const rd = this.store.realTasks();
        if (rd.status === 'ok') {
          this.store.setTasks(rd.data.filter(t => t.id !== tempTask.id));
        }
        this.notif.showToast('Не удалось создать задачу', '✗');
        return of(tempTask);
      })
    );
  }

  delete(task: Task): Observable<void> {
    this.store.removeTask(task.id);
    return this.http.post<void>('/api/tasks/delete', { taskId: task.id, listId: task.listId }).pipe(
      catchError(() => {
        this.store.addTask(task);
        this.notif.showToast('Не удалось удалить задачу', '✗');
        return of(void 0);
      })
    );
  }
}
