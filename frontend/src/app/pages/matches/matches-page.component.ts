import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  ExtractionApiService,
  JobRecommendation,
  ResumeProfile
} from '../../services/extraction-api.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  standalone: true,
  selector: 'app-matches-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './matches-page.component.html',
  styleUrls: ['./matches-page.component.css']
})
export class MatchesPageComponent implements OnInit {
  private readonly api = inject(ExtractionApiService);
  private readonly session = inject(AuthSessionService);
  private readonly notifications = inject(NotificationService);

  loading = true;
  resume: ResumeProfile | null = null;
  recommendations: JobRecommendation[] = [];

  async ngOnInit(): Promise<void> {
    const userId = this.session.getCurrentUserId();
    if (!userId) {
      this.loading = false;
      this.notifications.notify('Sign in to view resume matching.', 'warning', 5000);
      return;
    }
    try {
      this.resume = await this.api.getResumeProfile();
      this.recommendations = await this.api.getRecommendations(20);
    } catch (error) {
      console.error(error);
      this.notifications.notify('Unable to load recommendations right now.', 'error', 6000);
    } finally {
      this.loading = false;
    }
  }

  get hasResume(): boolean {
    return !!this.resume;
  }

  get headline(): string {
    if (!this.resume) {
      return 'Upload your resume to start matching.';
    }
    return this.resume.headline || 'Resume profile';
  }

  get summary(): string | null {
    if (!this.resume?.summary) {
      return null;
    }
    const trimmed = this.resume.summary.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed;
  }
}
