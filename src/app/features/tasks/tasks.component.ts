import { Component, inject, computed, signal } from '@angular/core';
import { AppStore } from '../../core/store/app.store';
import { TasksService } from '../../core/services/tasks.service';
import { SheetsService } from '../../core/services/sheets.service';
import { Task } from '../../core/models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { SmartTimePipe } from '../../shared/pipes/smart-time.pipe';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [SkeletonLoaderComponent, SmartTimePipe],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss',
})
export class TasksComponent {
  protected store     = inject(AppStore);
  protected tasksSvc  = inject(TasksService);
  protected sheetsSvc = inject(SheetsService);

  newTaskTitle      = signal('');
  newSheetTaskTitle = signal('');

  // ── Google Tasks ───────────────────────────────────────────────
  tasks    = computed(() => this.store.realTasks());
  done     = computed(() => { const t = this.tasks(); return Array.isArray(t) ? t.filter(x => x.done).length : 0; });
  total    = computed(() => { const t = this.tasks(); return Array.isArray(t) ? t.length : 0; });
  progress = computed(() => this.total() > 0 ? Math.round((this.done() / this.total()) * 100) : 0);

  // ── Google Sheets Tasks ────────────────────────────────────────
  sheetsConfigured  = computed(() => this.sheetsSvc.isConfigured());
  sheetTasks        = computed(() => this.store.sheetTasks());
  sheetDone         = computed(() => { const t = this.sheetTasks(); return Array.isArray(t) ? t.filter(x => x.done).length : 0; });
  sheetTotal        = computed(() => { const t = this.sheetTasks(); return Array.isArray(t) ? t.length : 0; });
  sheetProgress     = computed(() => this.sheetTotal() > 0 ? Math.round((this.sheetDone() / this.sheetTotal()) * 100) : 0);

  // ── Google Tasks actions ───────────────────────────────────────
  toggle(task: Task): void { this.tasksSvc.toggle(task).subscribe(); }

  createTask(): void {
    const title = this.newTaskTitle().trim();
    if (!title) return;
    this.newTaskTitle.set('');
    this.tasksSvc.create(title).subscribe({
      next: (task) => {
        if (task.id.startsWith('temp-')) this.newTaskTitle.set(title);
      },
    });
  }

  onKeydown(event: KeyboardEvent): void { if (event.key === 'Enter') this.createTask(); }
  onInput(event: Event): void { this.newTaskTitle.set((event.target as HTMLInputElement).value); }

  // ── Google Sheets Tasks actions ────────────────────────────────
  toggleSheet(task: Task): void { this.sheetsSvc.toggle(task).subscribe(); }

  createSheetTask(): void {
    const title = this.newSheetTaskTitle().trim();
    if (!title) return;
    this.newSheetTaskTitle.set('');
    this.sheetsSvc.create(title).subscribe({
      next: (task) => { if (!task) this.newSheetTaskTitle.set(title); },
    });
  }

  onSheetKeydown(event: KeyboardEvent): void { if (event.key === 'Enter') this.createSheetTask(); }
  onSheetInput(event: Event): void { this.newSheetTaskTitle.set((event.target as HTMLInputElement).value); }

  // ── Helpers ────────────────────────────────────────────────────
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
