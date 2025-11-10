import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  emailVerified: boolean;
  accountStatus: string;
  roles: string[];
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/auth';

  signUp(payload: SignUpPayload): Promise<AuthUser> {
    return lastValueFrom(this.http.post<AuthUser>(`${this.baseUrl}/signup`, payload));
  }

  signIn(payload: SignInPayload): Promise<AuthResponse> {
    return lastValueFrom(this.http.post<AuthResponse>(`${this.baseUrl}/signin`, payload));
  }

  verifyEmail(token: string): Promise<void> {
    return lastValueFrom(this.http.post<void>(`${this.baseUrl}/verify`, { token }));
  }

  resendVerification(email: string): Promise<void> {
    return lastValueFrom(this.http.post<void>(`${this.baseUrl}/verify/resend`, { email }));
  }

  requestPasswordReset(email: string): Promise<void> {
    return lastValueFrom(this.http.post<void>(`${this.baseUrl}/password/forgot`, { email }));
  }

  resetPassword(token: string, newPassword: string): Promise<void> {
    return lastValueFrom(this.http.post<void>(`${this.baseUrl}/password/reset`, { token, newPassword }));
  }
}
