import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ExtractionApiService,
  JobDashboardStats,
  JobOffer,
  NO_ACTIVE_USER_ERROR
} from '../../services/extraction-api.service';
import { AuthSessionService } from '../../services/auth-session.service';

type TrendItem = { date: Date; label: string; count: number };
type BreakdownItem = { label: string; value: number; percentage: number };
type SortColumn = 'title' | 'company' | 'confidenceScore' | 'createdAt';
type SortValue = string | number | Date | null;

@Component({
  selector: 'app-results-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-page.component.html',
  styleUrls: ['./results-page.component.css']
})
export class ResultsPageComponent {
  private readonly api = inject(ExtractionApiService);
  private readonly session = inject(AuthSessionService);

  isLoading = true;
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

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    const userId = this.session.getCurrentUserId();
    if (!userId) {
      this.offers = [];
      this.filteredOffers = [];
      this.stats = null;
      this.errorMessage = 'Veuillez vous connecter pour consulter vos extractions.';
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
      if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.errorMessage = 'Veuillez vous connecter pour consulter vos extractions.';
      } else {
        this.errorMessage = 'Impossible de recuperer les donnees du tableau de bord.';
      }
    } finally {
      this.isLoading = false;
    }
  }

  async deleteOffer(offer: JobOffer): Promise<void> {
    if (!offer.id) {
      return;
    }
    const confirmed = window.confirm(`Supprimer l'offre "${offer.title ?? 'sans titre'}" ?`);
    if (!confirmed) {
      return;
    }
    this.deletingId = offer.id;
    try {
      await this.api.deleteOffer(offer.id);
      this.offers = this.offers.filter(item => item.id !== offer.id);
      this.applyFilters();
      const stats = await this.api.getStats();
      this.stats = stats;
      this.prepareDerivedData(stats);
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.errorMessage = 'Session invalide. Connectez-vous pour gerer vos extractions.';
        this.offers = [];
        this.filteredOffers = [];
        this.stats = null;
      } else {
        this.errorMessage = 'La suppression a echoue. Veuillez reessayer.';
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
    return new Date(this.stats.generatedAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  trackById(_: number, offer: JobOffer): string {
    return offer.id ?? '';
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
    this.filteredOffers = filtered;
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
    return date.toLocaleDateString(undefined, {
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
