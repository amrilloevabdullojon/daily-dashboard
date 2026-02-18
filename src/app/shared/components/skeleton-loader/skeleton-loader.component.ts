import { Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [NgFor],
  template: `
    @for (i of rows; track i) {
      <div class="skeleton-row">
        <div class="skeleton skeleton-avatar"></div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-line" style="width: 60%"></div>
          <div class="skeleton skeleton-line" style="width: 40%"></div>
        </div>
      </div>
    }
  `,
  styleUrl: './skeleton-loader.component.scss',
})
export class SkeletonLoaderComponent {
  @Input() count = 3;

  get rows(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
