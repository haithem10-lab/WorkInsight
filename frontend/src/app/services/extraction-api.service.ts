import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthSessionService } from './auth-session.service';

export const NO_ACTIVE_USER_ERROR = 'NO_ACTIVE_USER';

export interface JobOffer {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  contactEmail: string | null;
  skills: string[] | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  confidenceScore?: number | null;
  status?: string | null;
  createdAt?: string | null;
  processingTimeMs?: number | null;
  userId?: string | null;
}

export interface JobDashboardStats {
  totalOffers: number;
  offersToday: number;
  offersThisWeek: number;
  averageConfidence: number;
  sourceBreakdown: Record<string, number>;
  lastSevenDays: { date: string; count: number }[];
  topCompanies: { label: string; count: number }[];
  topSkills: { label: string; count: number }[];
  generatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ExtractionApiService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  private readonly baseUrl = '/api';

  submitExtraction(payload: FormData): Promise<JobOffer> {
    const options = this.buildOptions();
    return lastValueFrom(this.http.post<JobOffer>(`${this.baseUrl}/upload`, payload, options));
  }

  getOffers(): Promise<JobOffer[]> {
    const options = this.buildOptions();
    return lastValueFrom(this.http.get<JobOffer[]>(`${this.baseUrl}/jobs`, options));
  }

  getStats(): Promise<JobDashboardStats> {
    const options = this.buildOptions();
    return lastValueFrom(this.http.get<JobDashboardStats>(`${this.baseUrl}/jobs/stats`, options));
  }

  getRecentOffers(limit = 5): Promise<JobOffer[]> {
    const options = this.buildOptions({ limit: limit.toString() });
    return lastValueFrom(this.http.get<JobOffer[]>(`${this.baseUrl}/jobs/recent`, options));
  }

  deleteOffer(id: string): Promise<void> {
    const options = this.buildOptions();
    return lastValueFrom(this.http.delete<void>(`${this.baseUrl}/jobs/${id}`, options));
  }

  private buildOptions(extra?: Record<string, string>): { params: HttpParams } {
    const userId = this.session.getCurrentUserId();
    if (!userId) {
      throw new Error(NO_ACTIVE_USER_ERROR);
    }
    let params = new HttpParams().set('userId', userId);
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        params = params.set(key, value);
      }
    }
    return { params };
  }
}
