import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionService } from '../../services/auth-session.service';
import {
  ExtractionApiService,
  JobDashboardStats,
  JobOffer,
  ResumeProfile
} from '../../services/extraction-api.service';
import { LanguageService, UiLanguage } from '../../services/language.service';
import { UserPreferences, UserPreferencesService } from '../../services/user-preferences.service';
import { NotificationService } from '../../services/notification.service';

type ProfileErrorKey = 'fetchFailed';

interface ProfileCopy {
  planBadge: string;
  actions: {
    submit: string;
    results: string;
    logout: string;
  };
  status: {
    loading: string;
  };
  errors: Record<ProfileErrorKey, string>;
  summary: {
    total: { label: string; hint: string };
    week: { label: string; hint: string };
    confidence: { label: string; hint: string };
    last: {
      label: string;
      hint: string;
      empty: string;
      pending: string;
      recentlyCompleted: string;
    };
  };
  sources: {
    title: string;
    subtitle: string;
    empty: string;
  };
  resume: {
    title: string;
    subtitle: string;
    upload: string;
    uploading: string;
    uploaded: string;
    uploadError: string;
    lastUpdated: string;
    noResume: string;
    noHeadline: string;
    skillsLabel: string;
    locationsLabel: string;
  };
  recommendations: {
    title: string;
    subtitle: string;
    emptyNoResume: string;
    empty: string;
    matchLabel: string;
  };
  notifications: {
    title: string;
    subtitle: string;
    toggles: {
      alertLowConfidence: string;
      weeklyDigest: string;
    };
  };
  emptyStats: {
    title: string;
    description: string;
  };
  recent: {
    title: string;
    viewAll: string;
    empty: string;
    untitled: string;
    fallbackSource: string;
    pending: string;
    noConfidence: string;
  };
  guest: {
    title: string;
    description: string;
    signup: string;
    signin: string;
  };
}

const PROFILE_COPY: Record<UiLanguage, ProfileCopy> = {
  en: {
    planBadge: 'Free trial',
    actions: {
      submit: 'Submit extraction',
      results: 'View results',
      logout: 'Logout'
    },
    status: {
      loading: 'Fetching your activity...'
    },
    errors: {
      fetchFailed: 'Unable to load your activity summary right now.'
    },
    summary: {
      total: { label: 'Total extractions', hint: 'All time' },
      week: { label: 'This week', hint: 'Past 7 days' },
      confidence: { label: 'Average confidence', hint: 'Across recent jobs' },
      last: {
        label: 'Last extraction',
        hint: 'Keep new submissions coming',
        empty: 'No extractions yet',
        pending: 'Pending',
        recentlyCompleted: 'Recently completed'
      }
    },
    sources: {
      title: 'Source breakdown',
      subtitle: 'Where your jobs originate',
      empty: 'No submissions recorded yet.'
    },
    resume: {
      title: 'Your resume',
      subtitle: 'Upload a CV to unlock tailored job recommendations.',
      upload: 'Upload resume',
      uploading: 'Uploading...',
      uploaded: 'R?sum? processed successfully. Recommendations updated.',
      uploadError: 'Unable to process your resume right now.',
      lastUpdated: 'Last updated',
      noResume: 'No resume on file yet. Upload one to get personalised matches.',
      noHeadline: 'R?sum? profile',
      skillsLabel: 'Key skills',
      locationsLabel: 'Preferred locations'
    },
    recommendations: {
      title: 'Recommended for you',
      subtitle: 'Jobs that align with your resume profile.',
      emptyNoResume: 'Upload your resume to receive personalised job suggestions.',
      empty: 'No matches yet. We will refresh this list as new jobs are extracted.',
      matchLabel: 'Matching skills'
    },
    notifications: {
      title: 'Notifications',
      subtitle: 'Stay informed about results',
      toggles: {
        alertLowConfidence: 'Alert me when confidence < 60%',
        weeklyDigest: 'Send a weekly extraction digest'
      }
    },
    emptyStats: {
      title: 'No activity yet',
      description: 'Run your first extraction to see metrics here.'
    },
    recent: {
      title: 'Recent extractions',
      viewAll: 'View all',
      empty: 'Your latest extractions will appear here once you run them.',
      untitled: 'Untitled offer',
      fallbackSource: 'Manual',
      pending: 'Pending',
      noConfidence: 'n/a'
    },
    guest: {
      title: 'You are not signed in',
      description: 'Create an account or sign in to access your saved extractions and update your profile.',
      signup: 'Create account',
      signin: 'Sign in'
    }
  },
  fr: {
    planBadge: 'Essai gratuit',
    actions: {
      submit: 'Soumettre une extraction',
      results: 'Voir les resultats',
      logout: 'Se deconnecter'
    },
    status: {
      loading: 'Recuperation de vos activites...'
    },
    errors: {
      fetchFailed: 'Impossible de charger votre resume pour le moment.'
    },
    summary: {
      total: { label: 'Total des extractions', hint: 'Depuis le debut' },
      week: { label: 'Cette semaine', hint: '7 derniers jours' },
      confidence: { label: 'Confiance moyenne', hint: 'Sur les offres recentes' },
      last: {
        label: 'Derniere extraction',
        hint: 'Continuez a envoyer de nouvelles soumissions',
        empty: 'Aucune extraction pour le moment',
        pending: 'En attente',
        recentlyCompleted: 'Recemment finalisee'
      }
    },
    sources: {
      title: 'Repartition des sources',
      subtitle: 'Origine de vos offres',
      empty: 'Aucune soumission enregistree.'
    },
    resume: {
      title: 'Votre CV',
      subtitle: 'Deposez un CV pour obtenir des recommandations personnalisees.',
      upload: 'Televerser le CV',
      uploading: 'Televersement...',
      uploaded: 'CV analyse. Les recommandations ont ete mises a jour.',
      uploadError: 'Impossible d\'analyser votre CV pour le moment.',
      lastUpdated: 'Derniere mise a jour',
      noResume: 'Aucun CV enregistre. Televersez-en un pour recevoir des suggestions.',
      noHeadline: 'Profil du CV',
      skillsLabel: 'Competences clefs',
      locationsLabel: 'Localisations preferees'
    },
    recommendations: {
      title: 'Recommandations pour vous',
      subtitle: 'Offres correspondant a votre profil.',
      emptyNoResume: 'Televersez votre CV pour recevoir des suggestions personnalisees.',
      empty: 'Aucune correspondance pour l\'instant. Nous actualiserons cette liste avec de nouvelles offres.',
      matchLabel: 'Competences correspondantes'
    },
    notifications: {
      title: 'Notifications',
      subtitle: 'Restez informe des resultats',
      toggles: {
        alertLowConfidence: 'M\'avertir quand la confiance < 60 %',
        weeklyDigest: 'Envoyer un digest hebdomadaire'
      }
    },
    emptyStats: {
      title: 'Aucune activite',
      description: 'Lancez une premiere extraction pour voir vos indicateurs.'
    },
    recent: {
      title: 'Dernieres extractions',
      viewAll: 'Voir tout',
      empty: 'Vos dernieres extractions apparaitront ici apres execution.',
      untitled: 'Offre sans titre',
      fallbackSource: 'Manuel',
      pending: 'En attente',
      noConfidence: 'n/d'
    },
    guest: {
      title: 'Vous n etes pas connecte',
      description: 'Creez un compte ou connectez-vous pour retrouver vos extractions et mettre a? jour votre profil.',
      signup: 'Creer un compte',
      signin: 'Se connecter'
    }
  }
};

const DATE_LOCALE: Record<UiLanguage, string> = {
  en: 'en-US',
  fr: 'fr-FR'
};

@Component({
  standalone: true,
  selector: 'app-profile-page',
  imports: [CommonModule],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.css']
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly api = inject(ExtractionApiService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly subscription = new Subscription();
  private readonly preferences = inject(UserPreferencesService);
  private readonly notifications = inject(NotificationService);

  readonly user$ = this.session.currentUser$;

  text: ProfileCopy = PROFILE_COPY[this.languageService.getCurrentLanguage()];
  private currentLanguage: UiLanguage = this.languageService.getCurrentLanguage();
  private lastErrorKey: ProfileErrorKey | null = null;

  loading = true;
  errorMessage = '';
  stats: JobDashboardStats | null = null;
  recentOffers: JobOffer[] = [];

  settings: UserPreferences = this.preferences.defaults;
  resumeProfile: ResumeProfile | null = null;
  resumeUploading = false;

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.currentLanguage = language;
        this.text = PROFILE_COPY[language];
        this.errorMessage = this.lastErrorKey ? this.text.errors[this.lastErrorKey] : '';
      });
  }

  ngOnInit(): void {
    this.subscription.add(
      this.user$.subscribe(user => {
        if (user) {
          this.settings = this.preferences.get(user.id);
          void this.fetchData();
          void this.loadResumeData(user.id);
        } else {
          this.settings = this.preferences.defaults;
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
    this.setError(null);
    try {
      const [stats, offers] = await Promise.all([this.api.getStats(), this.api.getOffers()]);
      this.stats = stats;
      this.recentOffers = this.buildRecentOffers(offers ?? []);
    } catch (error) {
      console.error(error);
      this.stats = null;
      this.recentOffers = [];
      this.setError('fetchFailed');
    } finally {
      this.loading = false;
    }
  }

  private async loadResumeData(userId: string): Promise<void> {
    try {
      this.resumeProfile = await this.api.getResumeProfile();
    } catch (error) {
      console.error(error);
      this.resumeProfile = null;
    }
  }

  signOut(): void {
    this.session.clear();
    this.router.navigate(['/']);
  }

  get lastExtractionLabel(): string {
    if (!this.recentOffers.length) {
      return this.text.summary.last.empty;
    }
    const recent = this.recentOffers[0];
    if (!recent.createdAt) {
      return this.text.summary.last.recentlyCompleted;
    }
    return new Date(recent.createdAt).toLocaleString(this.dateLocale, {
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

  private buildRecentOffers(offers: JobOffer[]): JobOffer[] {
    const toTimestamp = (offer: JobOffer): number => {
      if (!offer.createdAt) {
        return 0;
      }
      const time = Date.parse(offer.createdAt);
      return Number.isFinite(time) ? time : 0;
    };
    return [...offers]
      .sort((a, b) => toTimestamp(b) - toTimestamp(a))
      .slice(0, 5);
  }

  private resetData(): void {
    this.loading = false;
    this.setError(null);
    this.stats = null;
    this.recentOffers = [];
    this.resumeProfile = null;
  }

  navigate(path: string): void {
    const target = path.startsWith('/') ? path : `/${path}`;
    this.router.navigate([target]);
  }

  async onResumeSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.resumeUploading = true;
    try {
      this.resumeProfile = await this.api.uploadResume(file);
      this.notifications.notify(this.text.resume.uploaded, 'success', 6000);
    this.router.navigate(['/matches']);
  } catch (error) {
    console.error(error);
    this.notifications.notify(this.text.resume.uploadError, 'error', 7000);
  } finally {
      this.resumeUploading = false;
      input.value = '';
    }
  }

  get resumeUploadNote(): string {
    return this.currentLanguage === 'fr'
      ? 'Formats acceptés : PDF, DOCX, DOC, TXT · ≤ 5 Mo'
      : 'Formats: PDF, DOCX, DOC, TXT · ≤ 5 MB';
  }

  toggleSetting(key: keyof UserPreferences): void {
    this.settings = { ...this.settings, [key]: !this.settings[key] };
    const userId = this.session.getCurrentUserId();
    if (userId) {
      this.preferences.overwrite(userId, this.settings);
    }
  }

  private setError(key: ProfileErrorKey | null): void {
    this.lastErrorKey = key;
    this.errorMessage = key ? this.text.errors[key] : '';
  }

  get dateLocale(): string {
    return DATE_LOCALE[this.currentLanguage];
  }

}






