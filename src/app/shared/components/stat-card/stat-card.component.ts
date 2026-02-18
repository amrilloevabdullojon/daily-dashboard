import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

export type StatCardColor = 'blue' | 'green' | 'yellow' | 'purple';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="stat-card" [ngClass]="color">
      <div class="stat-label">{{ label }}</div>
      <div class="stat-value" [ngClass]="color">{{ value }}</div>
      @if (sub) {
        <div class="stat-sub">{{ sub }}</div>
      }
    </div>
  `,
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() color: StatCardColor = 'blue';
  @Input() sub?: string;
}
