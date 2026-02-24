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

  private notifiedEvents = new Set<string>();
  private notifiedDate   = '';
  private alertTimer: ReturnType<typeof setTimeout> | null = null;

  showToast(message: string, icon = '✓', durationMs = 3000): void {
    const id = ++this.toastCounter;
    this.toasts.update(t => [...t, { id, message, icon }]);
    setTimeout(() => this.dismissToast(id), durationMs);
  }

  dismissToast(id: number): void {
    this.toasts.update(t => t.filter(toast => toast.id !== id));
  }

  showMeetingAlert(event: CalEvent, minsLeft: number): void {
    // Clear previous auto-dismiss timer to avoid race condition
    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.meetingAlert.set({ event, minsLeft });
    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(`Встреча через ${minsLeft} мин`, {
        body: event.title,
        icon: '/favicon.ico',
      });
    }
    // Auto-dismiss after 10s
    this.alertTimer = setTimeout(() => this.dismissMeetingAlert(), 10000);
  }

  dismissMeetingAlert(): void {
    if (this.alertTimer) { clearTimeout(this.alertTimer); this.alertTimer = null; }
    this.meetingAlert.set(null);
  }

  checkUpcomingMeetings(events: CalEvent[]): void {
    const now = new Date();
    const today = now.toDateString();
    if (this.notifiedDate !== today) {
      this.notifiedEvents.clear();
      this.notifiedDate = today;
    }
    for (const ev of events) {
      if (ev.allDay) continue;
      const start = new Date(ev.start);
      const minsLeft = Math.round((start.getTime() - now.getTime()) / 60000);
      // Use time-range buckets so notifications fire even if sync timing is off by a few minutes
      let bucket: string | null = null;
      if (minsLeft > 10 && minsLeft <= 15)     bucket = `${ev.id}-15`;
      else if (minsLeft > 5 && minsLeft <= 10) bucket = `${ev.id}-10`;
      else if (minsLeft > 0 && minsLeft <= 5)  bucket = `${ev.id}-5`;
      if (bucket && !this.notifiedEvents.has(bucket)) {
        this.notifiedEvents.add(bucket);
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
