import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { apiClient } from './apiClient';
import { getAccessToken, getCurrentUserId } from '../store/sessionStore';

export interface JobOffer {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  contactEmail?: string | null;
  skills?: string[] | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  confidenceScore?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  status?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  rawTextSnapshot?: string | null;
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

export interface ResumeProfile {
  headline: string | null;
  summary: string | null;
  skills: string[];
  preferredLocations: string[];
  updatedAt?: string | null;
  photoData?: string | null;
}

export interface JobRecommendation {
  jobId: string;
  title: string | null;
  company: string | null;
  location: string | null;
  matchScore: number;
  matchedSkills: string[];
  summary?: string | null;
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

export const ExtractionService = {
  async submitExtraction(form: FormData) {
    const { data } = await apiClient.post<JobOffer>('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  async listJobs() {
    const { data } = await apiClient.get<JobOffer[]>('/jobs');
    return data;
  },
  async getStats() {
    const { data } = await apiClient.get<JobDashboardStats>('/jobs/stats');
    return data;
  },
  async getRecentJobs(limit = 5) {
    const { data } = await apiClient.get<JobOffer[]>('/jobs/recent', { params: { limit } });
    return data;
  },
  async getResumeProfile() {
    const { data } = await apiClient.get<ResumeProfile | null>('/resume');
    return data;
  },
  async uploadResume(file: { uri: string; name: string; type: string }) {
    const form = new FormData();
    form.append('resume', file as any);
    const { data } = await apiClient.post<ResumeProfile>('/resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  async uploadPhoto(file: { uri: string; name: string; type: string }) {
    const form = new FormData();
    form.append('photo', file as any);
    const { data } = await apiClient.post<ResumeProfile>('/resume/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  },
  async getRecommendations(limit = 5) {
    const { data } = await apiClient.get<JobRecommendation[]>('/recommendations', { params: { limit } });
    return data;
  },
  async updateOffer(id: string, payload: JobOfferUpdatePayload) {
    const { data } = await apiClient.patch<JobOffer>(`/jobs/${id}`, payload);
    return data;
  },
  async getOfferSuggestion(id: string) {
    const { data } = await apiClient.post<JobOfferSuggestion | null>(`/jobs/${id}/suggestions`, {});
    return data;
  },
  async exportJobs() {
    const token = getAccessToken();
    const userId = getCurrentUserId();
    if (!token || !userId) {
      throw new Error('You must be signed in to export data.');
    }
    const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const downloadUrl = `${base}/jobs/export?userId=${encodeURIComponent(userId)}`;
    const targetPath = `${FileSystem.cacheDirectory}workinsight-export-${Date.now()}.xlsx`;
    const download = FileSystem.createDownloadResumable(downloadUrl, targetPath, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await download.downloadAsync();
    if (!result || result.status !== 200) {
      throw new Error('Export download failed.');
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Share WorkInsight export'
      });
    }
    return result.uri;
  }
};
