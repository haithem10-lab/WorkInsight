import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
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

  signIn(payload: SignInPayload): Promise<AuthUser> {
    return lastValueFrom(this.http.post<AuthUser>(`${this.baseUrl}/signin`, payload));
  }
}
