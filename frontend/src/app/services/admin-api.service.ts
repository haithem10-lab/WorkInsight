import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface AdminUser {
  id: string;
  email: string;
  fullName?: string | null;
  emailVerified: boolean;
  accountStatus: string;
  roles: string[];
  createdAt?: string | null;
  lastExtractionAt?: string | null;
  extractionCount: number;
  statusUpdatedAt?: string | null;
  statusReason?: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/users';

  listUsers(): Promise<AdminUser[]> {
    return lastValueFrom(this.http.get<AdminUser[]>(this.baseUrl));
  }

  blockUser(userId: string, reason?: string | null): Promise<AdminUser> {
    const payload = reason && reason.trim().length > 0 ? { reason: reason.trim() } : {};
    return lastValueFrom(this.http.post<AdminUser>(`${this.baseUrl}/${userId}/block`, payload));
  }

  unblockUser(userId: string): Promise<AdminUser> {
    return lastValueFrom(this.http.post<AdminUser>(`${this.baseUrl}/${userId}/unblock`, {}));
  }

  resendVerification(userId: string): Promise<void> {
    return lastValueFrom(this.http.post<void>(`${this.baseUrl}/${userId}/resend-verification`, {}));
  }
}

