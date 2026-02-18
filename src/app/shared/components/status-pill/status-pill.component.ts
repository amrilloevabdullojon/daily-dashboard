import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export type StatusPillType = 'progress' | 'review' | 'approval' | 'todo' | 'done';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="status-pill" [ngClass]="'status-' + type">{{ label }}</span>
  `,
  styleUrl: './status-pill.component.scss',
})
export class StatusPillComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) type!: StatusPillType;
}
