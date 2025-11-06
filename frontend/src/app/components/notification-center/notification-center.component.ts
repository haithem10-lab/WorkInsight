import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AppNotification,
  NotificationService
} from '../../services/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.css']
})
export class NotificationCenterComponent {
  private readonly notificationService = inject(NotificationService);
  readonly notifications$: Observable<AppNotification[]> = this.notificationService.stream$;

  dismiss(id: number): void {
    this.notificationService.dismiss(id);
  }

  trackById(_: number, item: AppNotification): number {
    return item.id;
  }

  variantClass(notification: AppNotification): string {
    return `toast--${notification.variant}`;
  }
}

