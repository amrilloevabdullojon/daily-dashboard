import { Injectable, signal } from '@angular/core';
import { CalEvent } from '../models';

export interface Toast {
  id: number;
  message: string;
  icon?: string;
}

export interface MeetingAlert {
  event: CalEvent;
  minsLeft: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastCounter = 0;
  toasts = signal<Toast[]>([]);
  meetingAlert = signal<MeetingAlert | null>(null);

  // Map of key → timestamp (ms). Entries older than 24 h are discarded to prevent memory leak.
  private notifiedEvents = new Map<string, number>();
  private readonly NOTIFY_TTL_MS = 24 * 60 * 60 * 1000;

  showToast(message: string, icon = '✓', durationMs = 3000): void {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, message, icon }]);
    setTimeout(() => this.dismissToast(id), durationMs);
  }

  dismissToast(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  showMeetingAlert(event: CalEvent, minsLeft: number): void {
    this.meetingAlert.set({ event, minsLeft });
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(`Встреча через ${minsLeft} мин`, {
        body: event.title,
        icon: '/favicon.ico',
      });
    }
    // Auto-dismiss after 10s
    setTimeout(() => this.dismissMeetingAlert(), 10000);
  }

  dismissMeetingAlert(): void {
    this.meetingAlert.set(null);
  }

  checkUpcomingMeetings(events: CalEvent[]): void {
    const now = Date.now();

    // Clean up entries older than 24 hours
    for (const [key, ts] of this.notifiedEvents) {
      if (now - ts > this.NOTIFY_TTL_MS) {
        this.notifiedEvents.delete(key);
      }
    }

    const nowDate = new Date(now);
    for (const ev of events) {
      if (ev.allDay) continue;
      const start = new Date(ev.start);
      const minsLeft = Math.round((start.getTime() - nowDate.getTime()) / 60000);
      const key = `${ev.id}-${minsLeft}`;
      if ([5, 10, 15].includes(minsLeft) && !this.notifiedEvents.has(key)) {
        this.notifiedEvents.set(key, now);
        this.showMeetingAlert(ev, minsLeft);
        break;
      }
    }
  }

  async requestPermission(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }
}
