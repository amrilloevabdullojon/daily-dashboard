import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'smartTime', standalone: true, pure: false })
export class SmartTimePipe implements PipeTransform {
  transform(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);

      if (diffMins < 1)    return 'только что';
      if (diffMins < 60)   return `${diffMins} мин`;
      if (diffHours < 24)  return `${diffHours} ч`;
      if (diffDays === 1)  return 'вчера';
      if (diffDays < 7)    return `${diffDays} дн`;
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }
}
