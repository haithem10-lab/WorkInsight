import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

export interface JobOffer {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  contactEmail: string | null;
  skills: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class ExtractionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  submitExtraction(payload: FormData): Promise<void> {
    return lastValueFrom(this.http.post<void>(`${this.baseUrl}/upload`, payload));
  }

  getOffers(): Promise<JobOffer[]> {
    return lastValueFrom(this.http.get<JobOffer[]>(`${this.baseUrl}/jobs`));
  }
}
