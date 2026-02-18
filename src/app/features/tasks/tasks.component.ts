import { Component, inject, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { AppStore } from '../../core/store/app.store';
import { TasksService } from '../../core/services/tasks.service';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SmartTimePipe } from '../../shared/pipes/smart-time.pipe';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [NgClass, SkeletonLoaderComponent, SmartTimePipe],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  protected store    = inject(AppStore);
  protected tasksSvc = inject(TasksService);

  newTaskTitle = signal('');

  tasks = computed(() => this.store.realTasks());
  done  = computed(() => { const t = this.tasks(); return Array.isArray(t) ? t.filter(x => x.done).length : 0; });
  total = computed(() => { const t = this.tasks(); return Array.isArray(t) ? t.length : 0; });
  progress = computed(() => this.total() > 0 ? Math.round((this.done() / this.total()) * 100) : 0);

  toggle(task: any): void { this.tasksSvc.toggle(task).subscribe(); }

  createTask(): void {
    const title = this.newTaskTitle().trim();
    if (!title) return;
    this.tasksSvc.create(title).subscribe();
    this.newTaskTitle.set('');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.createTask();
  }

  onInput(event: Event): void {
    this.newTaskTitle.set((event.target as HTMLInputElement).value);
  }

  isDueSoon(due?: string): boolean {
    if (!due) return false;
    const diff = new Date(due).getTime() - Date.now();
    return diff < 86400000 && diff > 0;
  }

  isOverdue(due?: string): boolean {
    if (!due) return false;
    return new Date(due).getTime() < Date.now();
  }
}
