import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExtractionApiService, JobOffer } from '../../services/extraction-api.service';

@Component({
  selector: 'app-results-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './results-page.component.html',
  styleUrls: ['./results-page.component.css']
})
export class ResultsPageComponent {
  private readonly api = inject(ExtractionApiService);
  isLoading = true;
  offers: JobOffer[] = [];
  errorMessage = '';

  constructor() {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.offers = await this.api.getOffers();
    } catch (error) {
      console.error(error);
      this.errorMessage = "Impossible de récupérer les offres extraites.";
    } finally {
      this.isLoading = false;
    }
  }
}
