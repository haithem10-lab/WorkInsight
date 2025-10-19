import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthSessionService } from '../../services/auth-session.service';
import { ExtractionApiService, JobDashboardStats, JobOffer } from '../../services/extraction-api.service';

@Component({
  standalone: true,
  selector: 'app-profile-page',
  imports: [CommonModule],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.css']
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private static readonly SETTINGS_KEY = 'workinsight:profile-settings';

  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly api = inject(ExtractionApiService);
  private readonly subscription = new Subscription();

  readonly user$ = this.session.currentUser$;

  loading = true;
  errorMessage = '';
  stats: JobDashboardStats | null = null;
  recentOffers: JobOffer[] = [];

  settings: ProfileSettings = ProfilePageComponent.defaultSettings();

  ngOnInit(): void {
    this.subscription.add(
      this.user$.subscribe(user => {
        if (user) {
          this.settings = this.loadSettings(user.id);
          void this.fetchData();
        } else {
          this.settings = ProfilePageComponent.defaultSettings();
          this.resetData();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private async fetchData(): Promise<void> {
    const userId = this.session.getCurrentUserId();
    if (!userId) {
      this.resetData();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    try {
      const [stats, recent] = await Promise.all([
        this.api.getStats(),
        this.api.getRecentOffers(5)
      ]);
      this.stats = stats;
      this.recentOffers = recent;
    } catch (error) {
      console.error(error);
      this.stats = null;
      this.recentOffers = [];
      this.errorMessage = 'Unable to load your activity summary right now.';
    } finally {
      this.loading = false;
    }
  }

  private resetData(): void {
    this.loading = false;
    this.errorMessage = '';
    this.stats = null;
    this.recentOffers = [];
  }

  navigate(path: string): void {
    const target = path.startsWith('/') ? path : `/${path}`;
    this.router.navigate([target]);
  }

  signOut(): void {
    this.session.clear();
    this.router.navigate(['/']);
  }

  get lastExtractionLabel(): string {
    if (!this.recentOffers.length) {
      return 'No extractions yet';
    }
    const recent = this.recentOffers[0];
    if (!recent.createdAt) {
      return 'Recently completed';
    }
    return new Date(recent.createdAt).toLocaleString(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get averageConfidence(): string {
    if (!this.stats) {
      return '0%';
    }
    return `${Math.round((this.stats.averageConfidence ?? 0) * 100)}%`;
  }

  get sourceBreakdown(): { label: string; value: number; percentage: number }[] {
    if (!this.stats || !this.stats.sourceBreakdown) {
      return [];
    }
    const total = Object.values(this.stats.sourceBreakdown).reduce((sum, value) => sum + value, 0);
    return Object.entries(this.stats.sourceBreakdown).map(([label, value]) => ({
      label,
      value,
      percentage: total ? Math.round((value / total) * 100) : 0
    }));
  }

  toggleSetting(key: keyof ProfileSettings): void {
    this.settings = { ...this.settings, [key]: !this.settings[key] };
    const userId = this.session.getCurrentUserId();
    if (userId) {
      this.saveSettings(userId, this.settings);
    }
  }

  private loadSettings(userId: string): ProfileSettings {
    if (typeof localStorage === 'undefined') {
      return ProfilePageComponent.defaultSettings();
    }
    const raw = localStorage.getItem(ProfilePageComponent.SETTINGS_KEY);
    if (!raw) {
      return ProfilePageComponent.defaultSettings();
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, ProfileSettings>;
      const settings = parsed?.[userId];
      if (!settings) {
        return ProfilePageComponent.defaultSettings();
      }
      return { ...ProfilePageComponent.defaultSettings(), ...settings };
    } catch {
      return ProfilePageComponent.defaultSettings();
    }
  }

  private saveSettings(userId: string, settings: ProfileSettings): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    let store: Record<string, ProfileSettings> = {};
    const raw = localStorage.getItem(ProfilePageComponent.SETTINGS_KEY);
    if (raw) {
      try {
        store = JSON.parse(raw) as Record<string, ProfileSettings>;
      } catch {
        store = {};
      }
    }
    store[userId] = settings;
    localStorage.setItem(ProfilePageComponent.SETTINGS_KEY, JSON.stringify(store));
  }

  private static defaultSettings(): ProfileSettings {
    return {
      preferPdf: true,
      preferImage: false,
      preferUrl: true,
      alertLowConfidence: true,
      weeklyDigest: false
    };
  }
}

interface ProfileSettings {
  preferPdf: boolean;
  preferImage: boolean;
  preferUrl: boolean;
  alertLowConfidence: boolean;
  weeklyDigest: boolean;
}
