import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthSessionService } from '../../services/auth-session.service';
import { AdminApiService, AdminUser } from '../../services/admin-api.service';
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
  photo: {
    upload: string;
    uploading: string;
    uploadSuccess: string;
    uploadError: string;
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
  admin: {
    heroEyebrow: string;
    heroSubtitle: string;
    quickActions: {
      controlCenter: string;
      pending: string;
    };
    summary: {
      total: { label: string; hint: string };
      active: { label: string; hint: string };
      blocked: { label: string; hint: string };
      pending: { label: string; hint: string };
    };
    panels: {
      pending: { title: string; empty: string; action: string };
      blocked: { title: string; empty: string };
      recent: { title: string; empty: string };
    };
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
      uploaded: 'Resume processed successfully. Recommendations updated.',
      uploadError: 'Unable to process your resume right now.',
      lastUpdated: 'Last updated',
      noResume: 'No resume on file yet. Upload one to get personalised matches.',
      noHeadline: 'Resume profile',
      skillsLabel: 'Key skills',
      locationsLabel: 'Preferred locations'
    },
    photo: {
      upload: 'Update photo',
      uploading: 'Uploading...',
      uploadSuccess: 'Profile photo updated.',
      uploadError: 'Could not upload photo. Try another image.'
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
      description: 'Create an account or sign in to access your extraction history and update your profile.',
      signup: 'Create account',
      signin: 'Sign in'
    },
    admin: {
      heroEyebrow: 'Admin lite',
      heroSubtitle: 'Monitor every workspace account, unblock teammates, and resend verification mails in seconds.',
      quickActions: {
        controlCenter: 'Open control center',
        pending: 'Review pending email'
      },
      summary: {
        total: { label: 'Workspace users', hint: 'All accounts' },
        active: { label: 'Active', hint: 'Can sign in' },
        blocked: { label: 'Blocked', hint: 'Access disabled' },
        pending: { label: 'Pending email', hint: 'Awaiting verification' }
      },
      panels: {
        pending: { title: 'Pending verification', empty: 'Everyone is verified right now.', action: 'Manage' },
        blocked: { title: 'Recently blocked', empty: 'No blocked accounts.' },
        recent: { title: 'Latest sign-ins', empty: 'No sign-ins recorded yet.' }
      }
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
    photo: {
      upload: 'Mettre a jour la photo',
      uploading: 'Televersement...',
      uploadSuccess: 'Photo de profil mise a jour.',
      uploadError: 'Impossible de televerser la photo.'
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
    },
    admin: {
      heroEyebrow: 'Console admin',
      heroSubtitle: 'Surveillez les comptes, debloquez les utilisateurs et renvoyez les emails de verification en un clic.',
      quickActions: {
        controlCenter: 'Ouvrir le control center',
        pending: 'Voir les verifications en attente'
      },
      summary: {
        total: { label: 'Utilisateurs', hint: 'Tous les comptes' },
        active: { label: 'Actifs', hint: 'Acces autorise' },
        blocked: { label: 'Bloques', hint: 'Acces suspendu' },
        pending: { label: 'Email en attente', hint: 'A verifier' }
      },
      panels: {
        pending: { title: 'Verifications en attente', empty: 'Aucun email a confirmer.', action: 'Gerer' },
        blocked: { title: 'Bloques recemment', empty: 'Aucun compte bloque.' },
        recent: { title: 'Connexions recentes', empty: 'Aucune connexion recente.' }
      }
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
  private readonly adminApi = inject(AdminApiService);

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
  photoUploading = false;
  isAdminUser = false;
  adminLoading = false;
  adminError = '';
  adminUsers: AdminUser[] = [];
  adminPending: AdminUser[] = [];
  adminBlocked: AdminUser[] = [];
  adminRecent: AdminUser[] = [];
  adminStats = { total: 0, blocked: 0, pending: 0, active: 0 };

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
          this.isAdminUser = this.session.isAdmin();
          if (this.isAdminUser) {
            this.settings = this.preferences.defaults;
            this.resetData();
            void this.loadAdminDashboard();
          } else {
            this.settings = this.preferences.get(user.id);
            void this.fetchData();
            void this.loadResumeData(user.id);
          }
        } else {
          this.isAdminUser = false;
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
    if (this.isAdminUser) {
      return;
    }
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
    if (this.isAdminUser) {
      return;
    }
    try {
      this.resumeProfile = await this.api.getResumeProfile();
      if (this.resumeProfile && 'photoData' in this.resumeProfile) {
        this.session.updatePhoto(this.resumeProfile.photoData ?? null);
      } else {
        this.session.updatePhoto(null);
      }
    } catch (error) {
      console.error(error);
      this.resumeProfile = null;
    }
  }

  private async loadAdminDashboard(): Promise<void> {
    this.adminLoading = true;
    this.adminError = '';
    try {
      const users = await this.adminApi.listUsers();
      this.adminUsers = users;
      this.computeAdminHighlights(users);
    } catch (error) {
      console.error(error);
      this.adminUsers = [];
      this.adminPending = [];
      this.adminBlocked = [];
      this.adminRecent = [];
      this.adminStats = { total: 0, blocked: 0, pending: 0, active: 0 };
      this.adminError = this.text.errors.fetchFailed;
    } finally {
      this.adminLoading = false;
    }
  }

  private computeAdminHighlights(users: AdminUser[]): void {
    const blocked = users.filter(user => user.accountStatus === 'BLOCKED');
    const pending = users.filter(user => !user.emailVerified);
    const total = users.length;
    const active = total - blocked.length;

    this.adminStats = {
      total,
      blocked: blocked.length,
      pending: pending.length,
      active: Math.max(active, 0)
    };

    this.adminBlocked = blocked.slice(0, 4);
    this.adminPending = pending.slice(0, 4);
    this.adminRecent = [...users]
      .sort((a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt))
      .slice(0, 5);
  }

  private toTimestamp(value?: string | null): number {
    if (!value) {
      return 0;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
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
    this.adminUsers = [];
    this.adminPending = [];
    this.adminBlocked = [];
    this.adminRecent = [];
    this.adminStats = { total: 0, blocked: 0, pending: 0, active: 0 };
    this.adminError = '';
    this.adminLoading = false;
  }

  navigate(path: string): void {
    const target = path.startsWith('/') ? path : `/${path}`;
    this.router.navigate([target]);
  }

  goToAdminDashboard(): void {
    this.navigate('/admin');
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

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input?.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    this.photoUploading = true;
    try {
      this.resumeProfile = await this.api.uploadProfilePhoto(file);
      this.notifications.notify(this.text.photo.uploadSuccess, 'success', 6000);
      this.session.updatePhoto(this.resumeProfile?.photoData ?? null);
    } catch (error) {
      console.error(error);
      this.notifications.notify(this.text.photo.uploadError, 'error', 7000);
    } finally {
      this.photoUploading = false;
      input.value = '';
    }
  }

  get resumeUploadNote(): string {
    return this.currentLanguage === 'fr'
      ? "Formats acceptes : PDF, DOCX, DOC, TXT jusqu'a 5 Mo"
      : 'Formats: PDF, DOCX, DOC, TXT up to 5 MB';
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

  formatAdminDate(value?: string | null): string {
    if (!value) {
      return this.currentLanguage === 'fr' ? 'Non defini' : 'No data';
    }
    return new Date(value).toLocaleDateString(this.dateLocale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  userInitials(user: { fullName?: string | null; email: string }): string {
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return parts[0].charAt(0).toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() ?? '?';
  }

  get dateLocale(): string {
    return DATE_LOCALE[this.currentLanguage];
  }

}






