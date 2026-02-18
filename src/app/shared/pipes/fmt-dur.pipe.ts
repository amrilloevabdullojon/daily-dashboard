import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fmtDur', standalone: true })
export class FmtDurPipe implements PipeTransform {
  /** Format minutes into human-readable duration */
  transform(minutes: number | null | undefined): string {
    if (minutes == null) return '';
    if (minutes < 60) return `${minutes}м`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
  }
}
