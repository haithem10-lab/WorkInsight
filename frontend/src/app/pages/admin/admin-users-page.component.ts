import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService, AdminUser } from '../../services/admin-api.service';
import { AuthSessionService } from '../../services/auth-session.service';

type UserFilter = 'all' | 'active' | 'blocked' | 'pending';

@Component({
  standalone: true,
  selector: 'app-admin-users-page',
  imports: [CommonModule],
  templateUrl: './admin-users-page.component.html',
  styleUrls: ['./admin-users-page.component.css']
})
export class AdminUsersPageComponent implements OnInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly session = inject(AuthSessionService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly users = signal<AdminUser[]>([]);
  readonly filter = signal<UserFilter>('all');
  readonly actionState = signal<Record<string, string>>({});

  readonly filteredUsers = computed(() => {
    const state = this.filter();
    return this.users().filter(user => {
      if (state === 'active') {
        return user.accountStatus !== 'BLOCKED';
      }
      if (state === 'blocked') {
        return user.accountStatus === 'BLOCKED';
      }
      if (state === 'pending') {
        return !user.emailVerified;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.refresh();
  }

  canAccess(): boolean {
    return this.session.isAdmin();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.adminApi.listUsers();
      this.users.set(data);
    } catch (error) {
      console.error(error);
      this.error.set('Unable to load users right now. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(filter: UserFilter): void {
    this.filter.set(filter);
  }

  trackById(_: number, user: AdminUser): string {
    return user.id;
  }

  statusLabel(user: AdminUser): string {
    if (user.accountStatus === 'BLOCKED') {
      return 'Blocked';
    }
    if (!user.emailVerified) {
      return 'Pending verification';
    }
    return 'Active';
  }

  isActionRunning(userId: string, action: string): boolean {
    return this.actionState()[`${userId}:${action}`] === 'running';
  }

  async blockUser(user: AdminUser): Promise<void> {
    const reason = window.prompt('Reason for blocking this account (optional):', user.statusReason ?? '') ?? undefined;
    await this.runUserAction(user.id, 'block', () => this.adminApi.blockUser(user.id, reason));
  }

  async unblockUser(user: AdminUser): Promise<void> {
    await this.runUserAction(user.id, 'unblock', () => this.adminApi.unblockUser(user.id));
  }

  async resendVerification(user: AdminUser): Promise<void> {
    await this.runUserAction(user.id, 'resend', async () => {
      await this.adminApi.resendVerification(user.id);
      return null;
    });
  }

  private async runUserAction(
      userId: string,
      action: string,
      operation: () => Promise<AdminUser | null>): Promise<void> {
    const key = `${userId}:${action}`;
    this.actionState.set({ ...this.actionState(), [key]: 'running' });
    this.error.set('');
    try {
      const updated = await operation();
      if (updated) {
        const replacements = this.users().map(user => (user.id === userId ? updated : user));
        this.users.set(replacements);
      }
    } catch (error) {
      console.error(error);
      this.error.set('Action failed. Please try again.');
    } finally {
      const nextState = { ...this.actionState() };
      delete nextState[key];
      this.actionState.set(nextState);
    }
  }
}

