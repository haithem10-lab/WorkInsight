import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ExtractionApiService,
  JobDashboardStats,
  JobOffer,
  JobOfferSuggestion,
  JobOfferUpdatePayload,
  NO_ACTIVE_USER_ERROR
} from '../../services/extraction-api.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { LanguageService, UiLanguage } from '../../services/language.service';
import { NotificationService } from '../../services/notification.service';
import * as L from 'leaflet';

interface ResultsCopy {
  dashboardTitle: string;
  subtitlePrefix: string;
  subtitleSuffix: string;
  startExtraction: string;
  refresh: string;
  refreshLoading: string;
  dashboardError: string;
  metricsTotal: string;
  metricsTotalHint: string;
  metricsToday: string;
  metricsTodayHint: string;
  metricsWeek: string;
  metricsWeekHint: string;
  metricsConfidence: string;
  metricsConfidenceHint: string;
  trendTitle: string;
  trendHint: string;
  sourcesTitle: string;
  sourcesHint: string;
  sourcesEmpty: string;
  companiesTitle: string;
  companiesHint: string;
  companiesEmpty: string;
  skillsTitle: string;
  skillsHint: string;
  skillsEmpty: string;
  mapTitle: string;
  mapHint: string;
  mapEmpty: string;
  mapLegendRecent: string;
  mapLegendWeek: string;
  mapLegendOlder: string;
  extractedTitle: string;
  extractedSubtitle: string;
  searchPlaceholder: string;
  sortHint: string;
  exportLabel: string;
  exportingLabel: string;
  exportFailed: string;
  loadingLabel: string;
  noOffers: string;
  noMatches: string;
  columnRole: string;
  columnCompany: string;
  columnSource: string;
  columnLocation: string;
  columnEmail: string;
  columnSkills: string;
  columnConfidence: string;
  columnStatus: string;
  columnCreated: string;
  columnActions: string;
  unknownSource: string;
  notAvailable: string;
  deleteLabel: string;
  deletingLabel: string;
  confirmDelete: string;
  deleteFailed: string;
  signInRequired: string;
  statusLabels: Record<string, string>;
  statusBadges: Record<string, 'completed' | 'pending' | 'failed' | 'default'>;
  noExtractionsYet: string;
  recentTitle: string;
  recentlyCompleted: string;
  untitledOffer: string;
  viewAll: string;
  detail: {
    title: string;
    subtitle: string;
    fields: {
      title: string;
      company: string;
      location: string;
      email: string;
      skills: string;
      status: string;
      notes: string;
      tags: string;
      confidence: string;
      updatedAt: string;
    };
    rawTitle: string;
    rawHint: string;
    save: string;
    saving: string;
    quickTagsLabel: string;
    addTagPlaceholder: string;
  };
  ai: {
    heading: string;
    button: string;
    loading: string;
    empty: string;
    apply: string;
    confidenceLabel: string;
  };
  toasts: {
    saveSuccess: string;
    saveError: string;
    suggestionReady: string;
    suggestionEmpty: string;
    suggestionError: string;
    suggestionApplied: string;
  };
}

const RESULTS_COPY: Record<UiLanguage, ResultsCopy> = {
  en: {
    dashboardTitle: 'Dashboard',
    subtitlePrefix: 'Real-time extraction tracking. Last update',
    subtitleSuffix: '.',
    startExtraction: 'New extraction',
    refresh: 'Refresh',
    refreshLoading: 'Loading...',
    dashboardError: 'Unable to retrieve dashboard data.',
    metricsTotal: 'Total offers',
    metricsTotalHint: 'Since launch',
    metricsToday: 'Today',
    metricsTodayHint: 'New extractions',
    metricsWeek: 'Last 7 days',
    metricsWeekHint: 'Weekly activity',
    metricsConfidence: 'Average confidence',
    metricsConfidenceHint: 'Score 0 to 1',
    trendTitle: 'Activity over the last 7 days',
    trendHint: 'Number of completed offers per day',
    sourcesTitle: 'Source breakdown',
    sourcesHint: 'Submission origin',
    sourcesEmpty: 'No data available yet.',
    companiesTitle: 'Top companies',
    companiesHint: 'Ranking by captured offers',
    companiesEmpty: 'No ranking yet.',
    skillsTitle: 'Frequent skills',
    skillsHint: 'Most detected keywords',
    skillsEmpty: 'Waiting for data.',
    mapTitle: 'Talent heatmap',
    mapHint: 'Pins show approximate city centers for each extracted offer. Colors indicate recency.',
    mapEmpty: 'No locations detected yet.',
    mapLegendRecent: 'Last 24h',
    mapLegendWeek: 'Last 7 days',
    mapLegendOlder: 'Older',
    extractedTitle: 'Extracted offers',
    extractedSubtitle: 'Details of recent records',
    searchPlaceholder: 'Search for a job, company or skill...',
    sortHint: 'Click columns to sort',
    exportLabel: 'Export to Excel',
    exportingLabel: 'Preparing...',
    exportFailed: 'Unable to export offers right now.',
    loadingLabel: 'Loading offers...',
    noOffers: 'No offers available yet.',
    noMatches: 'No offers match your search.',
    columnRole: 'Role',
    columnCompany: 'Company',
    columnSource: 'Source',
    columnLocation: 'Location',
    columnEmail: 'Email',
    columnSkills: 'Skills',
    columnConfidence: 'Confidence',
    columnStatus: 'Status',
    columnCreated: 'Created on',
    columnActions: 'Actions',
    unknownSource: 'Unknown',
    notAvailable: 'Not available',
    deleteLabel: 'Delete',
    deletingLabel: 'Deleting...',
    confirmDelete: 'Delete the offer',
    deleteFailed: 'Deletion failed. Please try again.',
    signInRequired: 'Please sign in to view your extractions.',
    statusLabels: {
      COMPLETED: 'Completed',
      PENDING: 'Pending',
      FAILED: 'Not completed',
      CANCELLED: 'Not completed',
      ERROR: 'Not completed',
      default: 'Completed'
    },
    statusBadges: {
      COMPLETED: 'completed',
      PENDING: 'pending',
      FAILED: 'failed',
      CANCELLED: 'failed',
      ERROR: 'failed',
      default: 'completed'
    },
    noExtractionsYet: 'No extractions yet',
    recentTitle: 'Recent extractions',
    recentlyCompleted: 'Recently completed',
    untitledOffer: 'Untitled offer',
    viewAll: 'View all',
    detail: {
      title: 'Offer details',
      subtitle: 'Review, tag and polish this extraction inline.',
      fields: {
        title: 'Role',
        company: 'Company',
        location: 'Location',
        email: 'Email',
        skills: 'Skills (comma separated)',
        status: 'Status',
        notes: 'Notes',
        tags: 'Tags',
        confidence: 'Confidence',
        updatedAt: 'Last updated'
      },
      rawTitle: 'Captured text',
      rawHint: 'Source excerpt captured during extraction.',
      save: 'Save changes',
      saving: 'Saving...',
      quickTagsLabel: 'Quick tags',
      addTagPlaceholder: 'Type and press Enter…'
    },
    ai: {
      heading: 'AI suggestions',
      button: 'Ask the co-pilot',
      loading: 'Analysing...',
      empty: 'No new improvements detected.',
      apply: 'Apply suggestion',
      confidenceLabel: 'Projected confidence'
    },
    toasts: {
      saveSuccess: 'Offer updated successfully.',
      saveError: 'Unable to save your changes right now.',
      suggestionReady: 'AI suggestions ready for review.',
      suggestionEmpty: 'No additional insights for this offer.',
      suggestionError: 'The co-pilot could not generate suggestions.',
      suggestionApplied: 'Suggestion applied to the form.'
    }
  },
  fr: {
    dashboardTitle: 'Tableau de bord',
    subtitlePrefix: 'Suivi des extractions en temps réel. Dernière mise à jour',
    subtitleSuffix: '.',
    startExtraction: 'Nouvelle extraction',
    refresh: 'Actualiser',
    refreshLoading: 'Chargement...',
    dashboardError: 'Impossible de récupérer les données du tableau de bord.',
    metricsTotal: 'Total offres',
    metricsTotalHint: 'Depuis le lancement',
    metricsToday: 'Aujourd\'hui',
    metricsTodayHint: 'Nouvelles extractions',
    metricsWeek: '7 derniers jours',
    metricsWeekHint: 'Activité hebdomadaire',
    metricsConfidence: 'Confiance moyenne',
    metricsConfidenceHint: 'Score de 0 à 1',
    trendTitle: 'Activité des 7 derniers jours',
    trendHint: 'Nombre d\'offres finalisées par jour',
    sourcesTitle: 'Répartition des sources',
    sourcesHint: 'Origine des soumissions',
    sourcesEmpty: 'Aucune donnée pour le moment.',
    companiesTitle: 'Top entreprises',
    companiesHint: 'Classement par offres capturées',
    companiesEmpty: 'Pas encore de classement.',
    skillsTitle: 'Compétences fréquentes',
    skillsHint: 'Mots clés détectés',
    skillsEmpty: 'En attente de données.',
    mapTitle: 'Carte des talents',
    mapHint: 'Les points indiquent un centre-ville approximatif pour chaque offre. Les couleurs montrent la recence.',
    mapEmpty: 'Aucune localisation detectee pour le moment.',
    mapLegendRecent: 'Dernières 24h',
    mapLegendWeek: '7 derniers jours',
    mapLegendOlder: 'Plus ancien',
    extractedTitle: 'Offres extraites',
    extractedSubtitle: 'Détail des enregistrements récents',
    searchPlaceholder: 'Rechercher une offre, une entreprise ou une compétence...',
    sortHint: 'Cliquez sur les colonnes pour trier',
    exportLabel: 'Exporter en Excel',
    exportingLabel: 'Pr�paration...',
    exportFailed: 'Impossible d\'exporter les offres pour le moment.',
    loadingLabel: 'Chargement des offres...',
    noOffers: 'Aucune offre disponible pour le moment.',
    noMatches: 'Aucune offre ne correspond à votre recherche.',
    columnRole: 'Poste',
    columnCompany: 'Entreprise',
    columnSource: 'Source',
    columnLocation: 'Localisation',
    columnEmail: 'Email',
    columnSkills: 'Compétences',
    columnConfidence: 'Confiance',
    columnStatus: 'Statut',
    columnCreated: 'Créé le',
    columnActions: 'Actions',
    unknownSource: 'Inconnu',
    notAvailable: 'Non disponible',
    deleteLabel: 'Supprimer',
    deletingLabel: 'Suppression...',
    confirmDelete: 'Supprimer l\'offre',
    deleteFailed: 'La suppression a échoué. Veuillez réessayer.',
    signInRequired: 'Veuillez vous connecter pour consulter vos extractions.',
    statusLabels: {
      COMPLETED: 'Terminee',
      PENDING: 'En attente',
      FAILED: 'Echouee',
      CANCELLED: 'Non terminee',
      ERROR: 'Non terminee',
      default: 'Terminee'
    },
    statusBadges: {
      COMPLETED: 'completed',
      PENDING: 'pending',
      FAILED: 'failed',
      CANCELLED: 'failed',
      ERROR: 'failed',
      default: 'completed'
    },
    noExtractionsYet: 'Pas encore d\'extraction',
    recentTitle: 'Dernières extractions',
    recentlyCompleted: 'Récemment finalisée',
    untitledOffer: 'Offre sans titre',
    viewAll: 'Voir tout',
    detail: {
      title: 'Fiche detaillee',
      subtitle: 'Ajustez et etiquetez cette extraction sans quitter la page.',
      fields: {
        title: 'Poste',
        company: 'Entreprise',
        location: 'Localisation',
        email: 'Email',
        skills: 'Competences (separees par des virgules)',
        status: 'Statut',
        notes: 'Notes',
        tags: 'Etiquettes',
        confidence: 'Confiance',
        updatedAt: 'Mis a jour'
      },
      rawTitle: 'Texte capture',
      rawHint: 'Extrait analyse pendant l extraction.',
      save: 'Enregistrer',
      saving: 'Enregistrement...',
      quickTagsLabel: 'Etiquettes rapides',
      addTagPlaceholder: 'Saisissez et appuyez sur Entree…'
    },
    ai: {
      heading: 'Suggestions IA',
      button: 'Demander au co-pilote',
      loading: 'Analyse en cours...',
      empty: 'Aucune amelioration detectee.',
      apply: 'Appliquer la suggestion',
      confidenceLabel: 'Confiance estimee'
    },
    toasts: {
      saveSuccess: 'Offre mise a jour avec succes.',
      saveError: 'Impossible de sauvegarder vos modifications pour le moment.',
      suggestionReady: 'Suggestions IA disponibles.',
      suggestionEmpty: 'Aucun nouvel apercu pour cette offre.',
      suggestionError: 'Le co-pilote n a pas pu generer de suggestions.',
      suggestionApplied: 'Suggestion appliquee au formulaire.'
    }
  }
};

const DATE_LOCALE: Record<UiLanguage, string> = {
  en: 'en-US',
  fr: 'fr-FR'
};

type TrendItem = { date: Date; label: string; count: number };
type BreakdownItem = { label: string; value: number; percentage: number };
type SortColumn = 'title' | 'company' | 'confidenceScore' | 'createdAt';
type SortValue = string | number | Date | null;

@Component({
  selector: 'app-results-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './results-page.component.html',
  styleUrls: ['./results-page.component.css']
})
export class ResultsPageComponent implements AfterViewInit {
  private readonly api = inject(ExtractionApiService);
  private readonly session = inject(AuthSessionService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  @ViewChild('mapContainer') private mapContainer?: ElementRef<HTMLDivElement>;

  isLoading = true;
  isExporting = false;
  offers: JobOffer[] = [];
  filteredOffers: JobOffer[] = [];
  stats: JobDashboardStats | null = null;
  errorMessage = '';

  dailyTrend: TrendItem[] = [];
  sourceBreakdown: BreakdownItem[] = [];
  topCompanies: BreakdownItem[] = [];
  topSkills: BreakdownItem[] = [];
  maxDailyCount = 1;

  searchTerm = '';
  sortColumn: SortColumn = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  deletingId: string | null = null;
  private currentLanguage: UiLanguage = this.languageService.getCurrentLanguage();

  expandedOfferId: string | null = null;
  detailForm: FormGroup | null = null;
  detailTags: string[] = [];
  detailRawText = '';
  savingDetail = false;
  suggestion: JobOfferSuggestion | null = null;
  suggestionLoading = false;
  suggestionAttempted = false;
  readonly quickTags: readonly string[] = ['Follow-up', 'Hot lead', 'Waiting reply', 'Archived', 'To review'];
  readonly maxTags = 12;

  mapHasData = false;
  private viewReady = false;
  private mapNeedsRefresh = false;
  private map: L.Map | null = null;
  private mapMarkers: L.LayerGroup | null = null;
  private readonly recencyColors: Record<'recent' | 'week' | 'older', string> = {
    recent: '#38bdf8',
    week: '#6366f1',
    older: '#94a3b8'
  };

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.currentLanguage = language;
        this.requestMapRefresh();
      });

    this.refresh();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.initializeMap();
    this.tryUpdateMap();
  }

  get text(): ResultsCopy {
    return RESULTS_COPY[this.currentLanguage];
  }

  goToExtraction(): void {
    this.router.navigate(['/upload']);
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.collapseDetail();
    const userId = this.session.getCurrentUserId();
    if (!userId) {
      this.offers = [];
      this.filteredOffers = [];
      this.stats = null;
      this.errorMessage = this.text.signInRequired;
      this.mapHasData = false;
      this.requestMapRefresh();
      this.isLoading = false;
      return;
    }
    try {
      const [offers, stats] = await Promise.all([
        this.api.getOffers(),
        this.api.getStats()
      ]);
      this.offers = offers;
      this.stats = stats;
      this.prepareDerivedData(stats);
      this.applyFilters();
    } catch (error) {
      console.error(error);
      this.offers = [];
      this.filteredOffers = [];
      this.stats = null;
      this.mapHasData = false;
      this.requestMapRefresh();
      if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.errorMessage = this.text.signInRequired;
      } else {
        this.errorMessage = this.text.dashboardError;
      }
    } finally {
      this.isLoading = false;
    }
  }

  async exportOffers(): Promise<void> {
    if (this.isExporting) {
      return;
    }
    try {
      this.isExporting = true;
      const blob = await this.api.exportOffers();
      if (!blob || blob.size === 0) {
        this.errorMessage = this.text.exportFailed;
        return;
      }
      this.triggerDownload(blob, this.buildExportFileName());
      this.errorMessage = '';
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.errorMessage = this.text.signInRequired;
      } else {
        this.errorMessage = this.text.exportFailed;
      }
    } finally {
      this.isExporting = false;
    }
  }

  toggleDetail(offer: JobOffer): void {
    if (!offer?.id) {
      return;
    }
    if (this.expandedOfferId === offer.id) {
      this.collapseDetail();
      return;
    }
    this.expandedOfferId = offer.id;
    this.detailForm = this.createDetailForm(offer);
    this.detailTags = [...(offer.tags ?? [])];
    this.detailRawText = offer.rawTextSnapshot ?? '';
    this.savingDetail = false;
    this.suggestion = null;
    this.suggestionLoading = false;
    this.suggestionAttempted = false;
  }

  collapseDetail(): void {
    this.expandedOfferId = null;
    this.detailForm = null;
    this.detailTags = [];
    this.detailRawText = '';
    this.savingDetail = false;
    this.suggestion = null;
    this.suggestionLoading = false;
    this.suggestionAttempted = false;
  }

  async saveDetail(): Promise<void> {
    if (!this.expandedOfferId || !this.detailForm || this.savingDetail) {
      return;
    }
    this.savingDetail = true;
    const value = this.detailForm.value as Record<string, unknown>;
    const payload: JobOfferUpdatePayload = {
      title: this.normalizeInput(value['title']),
      company: this.normalizeInput(value['company']),
      location: this.normalizeInput(value['location']),
      contactEmail: this.normalizeInput(value['contactEmail']),
      skills: this.parseSkills(value['skills']),
      status: this.normalizeInput(value['status']),
      notes: this.normalizeMultiline(value['notes']),
      tags: [...this.detailTags]
    };
    try {
      const updated = await this.api.updateOffer(this.expandedOfferId, payload);
      this.replaceOffer(updated);
      this.detailForm = this.createDetailForm(updated);
      this.detailTags = [...(updated.tags ?? [])];
      this.detailRawText = updated.rawTextSnapshot ?? '';
      this.notifications.notify(this.text.toasts.saveSuccess, 'success', 7000);
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.notifications.notify(this.text.signInRequired, 'warning', 7000);
      } else {
        this.notifications.notify(this.text.toasts.saveError, 'error', 7000);
      }
    } finally {
      this.savingDetail = false;
    }
  }

  addTag(raw: string | undefined | null): void {
    const tag = this.normalizeInput(raw);
    if (!tag) {
      return;
    }
    if (this.detailTags.includes(tag)) {
      return;
    }
    if (this.detailTags.length >= this.maxTags) {
      this.notifications.notify(
          `${this.detailTags.length}/${this.maxTags} ${this.text.detail.fields.tags}`,
          'info',
          5000
      );
      return;
    }
    this.detailTags = [...this.detailTags, tag];
  }

  removeTag(index: number): void {
    if (index < 0 || index >= this.detailTags.length) {
      return;
    }
    this.detailTags = this.detailTags.filter((_, i) => i !== index);
  }

  toggleQuickTag(tag: string): void {
    const exists = this.detailTags.includes(tag);
    if (exists) {
      this.detailTags = this.detailTags.filter(entry => entry !== tag);
    } else {
      this.addTag(tag);
    }
  }

  onAskCopilot(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void this.loadSuggestions();
  }

  private async loadSuggestions(): Promise<void> {
    if (!this.expandedOfferId || this.suggestionLoading) {
      return;
    }
    const offer = this.activeOffer;
    if (!offer) {
      return;
    }
    if (!offer.rawTextSnapshot || offer.rawTextSnapshot.trim().length === 0) {
      this.suggestion = null;
      this.suggestionAttempted = true;
      this.notifications.notify(this.text.toasts.suggestionEmpty, 'info', 6000);
      return;
    }
    this.suggestionLoading = true;
    this.suggestionAttempted = true;
    try {
      const suggestion = await this.api.getOfferSuggestions(this.expandedOfferId);
      if (suggestion) {
        this.suggestion = suggestion;
        this.notifications.notify(this.text.toasts.suggestionReady, 'info', 7000);
      } else {
        this.suggestion = null;
        this.notifications.notify(this.text.toasts.suggestionEmpty, 'info', 6000);
      }
    } catch (error) {
      console.error(error);
      this.suggestion = null;
      this.notifications.notify(this.text.toasts.suggestionError, 'error', 7000);
    } finally {
      this.suggestionLoading = false;
    }
  }

  applySuggestion(): void {
    if (!this.detailForm || !this.suggestion) {
      return;
    }
    this.detailForm.patchValue({
      title: this.suggestion.title ?? '',
      company: this.suggestion.company ?? '',
      location: this.suggestion.location ?? '',
      contactEmail: this.suggestion.contactEmail ?? '',
      skills: (this.suggestion.skills ?? []).join(', ')
    });
    this.notifications.notify(this.text.toasts.suggestionApplied, 'success', 6000);
  }

  get activeOffer(): JobOffer | null {
    if (!this.expandedOfferId) {
      return null;
    }
    return this.offers.find(item => item.id === this.expandedOfferId) ?? null;
  }

  private createDetailForm(offer: JobOffer): FormGroup {
    return this.fb.group({
      title: [offer.title ?? ''],
      company: [offer.company ?? ''],
      location: [offer.location ?? ''],
      contactEmail: [offer.contactEmail ?? ''],
      skills: [(offer.skills ?? []).join(', ')],
      status: [offer.status ?? 'COMPLETED'],
      notes: [offer.notes ?? '']
    });
  }

  private replaceOffer(updated: JobOffer): void {
    const index = this.offers.findIndex(item => item.id === updated.id);
    if (index >= 0) {
      const next = [...this.offers];
      next[index] = updated;
      this.offers = next;
    } else {
      this.offers = [updated, ...this.offers];
    }
    this.applyFilters();
  }

  private parseSkills(input: unknown): string[] {
    if (typeof input !== 'string') {
      return [];
    }
    return input
        .split(/[,;\n]/)
        .map(entry => entry.trim())
        .filter(entry => entry.length > 0);
  }

  private normalizeInput(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  private normalizeMultiline(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    return normalized.length === 0 ? null : normalized;
  }

  async deleteOffer(offer: JobOffer): Promise<void> {
    if (!offer.id) {
      return;
    }
    const confirmMessage = `${this.text.confirmDelete} "${offer.title ?? this.text.untitledOffer}"?`;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      return;
    }
    this.deletingId = offer.id;
    try {
      await this.api.deleteOffer(offer.id);
      this.offers = this.offers.filter(item => item.id !== offer.id);
      this.applyFilters();
      if (this.expandedOfferId === offer.id) {
        this.collapseDetail();
      }
      const stats = await this.api.getStats();
      this.stats = stats;
      this.prepareDerivedData(stats);
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.errorMessage = this.text.signInRequired;
        this.offers = [];
        this.filteredOffers = [];
        this.stats = null;
      } else {
        this.errorMessage = this.text.deleteFailed;
      }
    } finally {
      this.deletingId = null;
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  toggleSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = column === 'createdAt' ? 'desc' : 'asc';
    }
    this.applyFilters();
  }

  get lastRefreshLabel(): string {
    if (!this.stats) {
      return '';
    }
    return new Date(this.stats.generatedAt).toLocaleTimeString(this.dateLocale, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackById(_: number, offer: JobOffer): string {
    return offer.id ?? '';
  }

  getStatusLabel(status: string | null | undefined): string {
    const normalized = status?.toUpperCase() ?? 'COMPLETED';
    return this.text.statusLabels[normalized] ?? this.text.statusLabels.default;
  }

  getStatusBadge(status: string | null | undefined): string {
    const normalized = status?.toUpperCase() ?? 'COMPLETED';
    return this.text.statusBadges[normalized] ?? this.text.statusBadges.default;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private buildExportFileName(): string {
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10);
    const timePart = now
      .toISOString()
      .slice(11, 19)
      .replace(/:/g, '');
    return `workinsight-jobs-${datePart}-${timePart}.xlsx`;
  }

  private applyFilters(): void {
    let filtered = [...this.offers];
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(offer =>
        [
          offer.title,
          offer.company,
          offer.location,
          offer.contactEmail,
          offer.sourceType,
          offer.status,
          ...(offer.skills ?? [])
        ].some(entry => entry && entry.toLowerCase().includes(term))
      );
    }
    const direction = this.sortDirection === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const aValue = this.getSortableValue(a, this.sortColumn);
      const bValue = this.getSortableValue(b, this.sortColumn);
      const result = this.compareValues(aValue, bValue);
      return result * direction;
    });
    if (this.expandedOfferId && !filtered.some(offer => offer.id === this.expandedOfferId)) {
      this.collapseDetail();
    }
    this.filteredOffers = filtered;
    this.requestMapRefresh();
  }

  private get dateLocale(): string {
    return DATE_LOCALE[this.currentLanguage];
  }

  private getSortableValue(offer: JobOffer, column: SortColumn): SortValue {
    switch (column) {
      case 'title':
        return offer.title ?? '';
      case 'company':
        return offer.company ?? '';
      case 'confidenceScore':
        return offer.confidenceScore ?? 0;
      case 'createdAt':
      default:
        return offer.createdAt ? new Date(offer.createdAt) : null;
    }
  }

  private compareValues(aValue: SortValue, bValue: SortValue): number {
    if (aValue === null && bValue === null) {
      return 0;
    }
    if (aValue === null) {
      return 1;
    }
    if (bValue === null) {
      return -1;
    }
    if (aValue instanceof Date && bValue instanceof Date) {
      return aValue.getTime() - bValue.getTime();
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return aValue - bValue;
    }
    return aValue.toString().localeCompare(bValue.toString(), undefined, { sensitivity: 'base' });
  }

  private requestMapRefresh(): void {
    this.mapNeedsRefresh = true;
    this.tryUpdateMap();
  }

  private tryUpdateMap(): void {
    if (!this.viewReady || !this.mapNeedsRefresh) {
      return;
    }
    if (!this.map) {
      this.initializeMap();
    }
    if (!this.map || !this.mapMarkers) {
      return;
    }
    this.mapNeedsRefresh = false;
    this.zone.runOutsideAngular(() => {
      this.renderMapData();
    });
  }

  private initializeMap(): void {
    if (this.map || !this.mapContainer) {
      return;
    }
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [20, 0],
      zoom: 2,
      scrollWheelZoom: false,
      worldCopyJump: true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(this.map);
    this.mapMarkers = L.layerGroup().addTo(this.map);
    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      this.map = null;
      this.mapMarkers = null;
    });
  }

  private renderMapData(): void {
    if (!this.map || !this.mapMarkers) {
      return;
    }
    this.mapMarkers.clearLayers();
    const offersWithCoords = this.filteredOffers.filter(offer => this.hasCoordinates(offer));
    this.mapHasData = offersWithCoords.length > 0;
    if (!offersWithCoords.length) {
      this.map.setView([20, 0], 2);
      this.map.invalidateSize();
      return;
    }
    const bounds = L.latLngBounds([]);
    const now = Date.now();
    for (const offer of offersWithCoords) {
      const lat = offer.latitude as number;
      const lng = offer.longitude as number;
      const bucket = this.getRecencyBucket(offer, now);
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        weight: 1,
        color: 'rgba(15,23,42,0.5)',
        fillColor: this.recencyColors[bucket],
        fillOpacity: 0.9
      }).bindTooltip(this.buildTooltipContent(offer), {
        direction: 'top',
        offset: L.point(0, -8),
        opacity: 0.92,
        sticky: true
      });
      marker.addTo(this.mapMarkers);
      bounds.extend([lat, lng]);
    }
    if (offersWithCoords.length === 1) {
      this.map.setView(bounds.getCenter(), 7);
    } else {
      this.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 8 });
    }
    this.map.invalidateSize();
  }

  private hasCoordinates(offer: JobOffer): boolean {
    const { latitude, longitude } = offer;
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  private getRecencyBucket(offer: JobOffer, now: number): 'recent' | 'week' | 'older' {
    if (!offer.createdAt) {
      return 'older';
    }
    const created = new Date(offer.createdAt).getTime();
    if (Number.isNaN(created)) {
      return 'older';
    }
    const diff = now - created;
    const day = 24 * 60 * 60 * 1000;
    if (diff <= day) {
      return 'recent';
    }
    if (diff <= 7 * day) {
      return 'week';
    }
    return 'older';
  }

  private buildTooltipContent(offer: JobOffer): string {
    const lines: string[] = [];
    lines.push(`<strong>${this.escapeTooltipText(offer.title ?? this.text.untitledOffer)}</strong>`);
    if (offer.company) {
      lines.push(this.escapeTooltipText(offer.company));
    }
    if (offer.location) {
      lines.push(this.escapeTooltipText(offer.location));
    }
    if (offer.status) {
      lines.push(this.escapeTooltipText(this.getStatusLabel(offer.status)));
    }
    return lines.join('<br/>');
  }

  private escapeTooltipText(value: string): string {
    return value.replace(/[&<>"']/g, character => {
      switch (character) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case '\'':
          return '&#39;';
        default:
          return character;
      }
    });
  }

  private prepareDerivedData(stats: JobDashboardStats): void {
    const total = Object.values(stats.sourceBreakdown ?? {}).reduce((sum, value) => sum + value, 0);
    this.sourceBreakdown = Object.entries(stats.sourceBreakdown ?? {}).map(([label, value]) => ({
      label,
      value,
      percentage: total ? Math.round((value / total) * 100) : 0
    }));

    let max = 1;
    this.dailyTrend = stats.lastSevenDays.map(item => {
      const date = new Date(`${item.date}T00:00:00`);
      if (item.count > max) {
        max = item.count;
      }
      return {
        date,
        count: item.count,
        label: this.formatDayLabel(date)
      };
    });
    this.maxDailyCount = Math.max(max, 1);

    this.topCompanies = (stats.topCompanies ?? []).map(entry => ({
      label: entry.label,
      value: entry.count,
      percentage: total ? Math.round((entry.count / total) * 100) : 0
    }));

    const totalSkills = (stats.topSkills ?? []).reduce((sum, entry) => sum + entry.count, 0);
    this.topSkills = (stats.topSkills ?? []).map(entry => ({
      label: entry.label,
      value: entry.count,
      percentage: totalSkills ? Math.round((entry.count / totalSkills) * 100) : 0
    }));
  }

  private formatDayLabel(date: Date): string {
    return date.toLocaleDateString(this.dateLocale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  toPercentage(value: number | null | undefined): string {
    if (!value) {
      return '0%';
    }
    return `${Math.round(value * 100)}%`;
  }
}
















