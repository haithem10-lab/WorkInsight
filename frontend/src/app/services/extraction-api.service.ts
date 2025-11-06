import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
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
  updatedAt?: string | null;
  processingTimeMs?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  rawTextSnapshot?: string | null;
  userId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface JobOfferUpdatePayload {
  title?: string | null;
  company?: string | null;
  location?: string | null;
  contactEmail?: string | null;
  skills?: string[] | null;
  status?: string | null;
  tags?: string[] | null;
  notes?: string | null;
}

export interface JobOfferSuggestion {
  title: string | null;
  company: string | null;
  location: string | null;
  contactEmail: string | null;
  skills: string[];
  updatedFields: string[];
  confidenceScore: number | null;
}

export interface ResumeProfile {
  headline: string | null;
  summary: string | null;
  skills: string[];
  preferredLocations: string[];
  updatedAt?: string | null;
}

export interface JobRecommendation {
  jobId: string;
  title: string | null;
  company: string | null;
  location: string | null;
  sourceType: string | null;
  confidenceScore: number | null | undefined;
  matchScore: number;
  matchedSkills: string[];
  summary: string | null;
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
    const params = this.buildParams();
    return lastValueFrom(this.http.post<JobOffer>(`${this.baseUrl}/upload`, payload, { params }));
  }

  getOffers(): Promise<JobOffer[]> {
    const params = this.buildParams();
    return lastValueFrom(this.http.get<JobOffer[]>(`${this.baseUrl}/jobs`, { params }));
  }

  getStats(): Promise<JobDashboardStats> {
    const params = this.buildParams();
    return lastValueFrom(this.http.get<JobDashboardStats>(`${this.baseUrl}/jobs/stats`, { params }));
  }

  getRecentOffers(limit = 5): Promise<JobOffer[]> {
    const params = this.buildParams({ limit: limit.toString() });
    return lastValueFrom(this.http.get<JobOffer[]>(`${this.baseUrl}/jobs/recent`, { params }));
  }

  deleteOffer(id: string): Promise<void> {
    const params = this.buildParams();
    return lastValueFrom(this.http.delete<void>(`${this.baseUrl}/jobs/${id}`, { params }));
  }

  updateOffer(id: string, payload: JobOfferUpdatePayload): Promise<JobOffer> {
    const params = this.buildParams();
    return lastValueFrom(this.http.patch<JobOffer>(`${this.baseUrl}/jobs/${id}`, payload, { params }));
  }

  async getOfferSuggestions(id: string): Promise<JobOfferSuggestion | null> {
    const params = this.buildParams();
    try {
      return await lastValueFrom(
        this.http.post<JobOfferSuggestion>(`${this.baseUrl}/jobs/${id}/suggestions`, {}, { params })
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 204) {
        return null;
      }
      throw error;
    }
  }

  uploadResume(file: File): Promise<ResumeProfile> {
    const params = this.buildParams();
    const payload = new FormData();
    payload.append('resume', file);
    return lastValueFrom(this.http.post<ResumeProfile>(`${this.baseUrl}/resume`, payload, { params }));
  }

  async getResumeProfile(): Promise<ResumeProfile | null> {
    const params = this.buildParams();
    try {
      return await lastValueFrom(this.http.get<ResumeProfile>(`${this.baseUrl}/resume`, { params }));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 204) {
        return null;
      }
      throw error;
    }
  }

  async getRecommendations(limit = 5): Promise<JobRecommendation[]> {
    const params = this.buildParams({ limit: limit.toString() });
    try {
      return await lastValueFrom(this.http.get<JobRecommendation[]>(`${this.baseUrl}/recommendations`, { params }));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 204) {
        return [];
      }
      throw error;
    }
  }

  exportOffers(): Promise<Blob> {
    const params = this.buildParams();
    return lastValueFrom(
      this.http.get(`${this.baseUrl}/jobs/export`, {
        params,
        responseType: 'blob'
      })
    );
  }

  private buildParams(extra?: Record<string, string>): HttpParams {
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
    return params;
  }
}
