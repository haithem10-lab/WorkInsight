import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationVariant = 'success' | 'info' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  message: string;
  variant: NotificationVariant;
  dismissible: boolean;
}

const DEFAULT_DURATION_MS = 7000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly subject = new BehaviorSubject<AppNotification[]>([]);
  private readonly timeouts = new Map<number, number>();
  private counter = 0;

  get stream$(): Observable<AppNotification[]> {
    return this.subject.asObservable();
  }

  notify(
      message: string,
      variant: NotificationVariant = 'info',
      durationMs: number = DEFAULT_DURATION_MS,
      dismissible = true
  ): number {
    if (!message) {
      return -1;
    }
    const id = ++this.counter;
    const notification: AppNotification = {
      id,
      message,
      variant,
      dismissible
    };
    const next = [...this.subject.value, notification];
    this.subject.next(next);

    if (durationMs > 0 && typeof window !== 'undefined') {
      const timerId = window.setTimeout(() => this.dismiss(id), durationMs);
      this.timeouts.set(id, timerId);
    }

    return id;
  }

  dismiss(id: number): void {
    if (this.timeouts.has(id)) {
      const handle = this.timeouts.get(id);
      if (handle !== undefined && typeof window !== 'undefined') {
        window.clearTimeout(handle);
      }
      this.timeouts.delete(id);
    }
    const filtered = this.subject.value.filter(notification => notification.id !== id);
    this.subject.next(filtered);
  }

  clear(): void {
    if (typeof window !== 'undefined') {
      for (const handle of this.timeouts.values()) {
        window.clearTimeout(handle);
      }
    }
    this.timeouts.clear();
    this.subject.next([]);
  }
}
