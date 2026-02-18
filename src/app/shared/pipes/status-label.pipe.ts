import { Pipe, PipeTransform } from '@angular/core';
import { StatusPillType } from '../components/status-pill/status-pill.component';

@Pipe({ name: 'statusType', standalone: true })
export class StatusTypePipe implements PipeTransform {
  transform(status: string | null | undefined): StatusPillType {
    const s = (status || '').toLowerCase();
    if (s.includes('progress') || s.includes('dev')) return 'progress';
    if (s.includes('review') || s.includes('testing')) return 'review';
    if (s.includes('approval') || s.includes('approv')) return 'approval';
    if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'done';
    return 'todo';
  }
}
