import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { Task } from '../models';
import { AppStore } from '../store/app.store';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http = inject(HttpClient);
  private store = inject(AppStore);

  load(): Observable<Task[]> {
    return this.http.get<Task[]>('/api/tasks/list').pipe(
      tap(tasks => this.store.setTasks(tasks)),
      catchError(() => {
        this.store.setTasks([]);
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
      done: !task.done,
    }).pipe(
      catchError(() => {
        // Revert on failure
        this.store.toggleTaskOptimistic(task.id);
        return of(void 0);
      })
    );
  }

  create(title: string): Observable<Task> {
    // Optimistic add
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      listId: '',
      title,
      done: false,
    };
    this.store.addTask(tempTask);

    return this.http.post<Task>('/api/tasks/create', { title }).pipe(
      tap(created => {
        // Replace temp task with real one
        const tasks = this.store.realTasks();
        if (!Array.isArray(tasks)) return;
        const updated = tasks.map(t => t.id === tempTask.id ? created : t);
        this.store.setTasks(updated);
      }),
      catchError(() => {
        // Remove temp task on failure
        const tasks = this.store.realTasks();
        if (Array.isArray(tasks)) {
          this.store.setTasks(tasks.filter(t => t.id !== tempTask.id));
        }
        return of(tempTask);
      })
    );
  }
}
