import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ExtractionApiService, NO_ACTIVE_USER_ERROR } from '../../services/extraction-api.service';
import { AuthSessionService } from '../../services/auth-session.service';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upload-page.component.html',
  styleUrls: ['./upload-page.component.css']
})
export class UploadPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ExtractionApiService);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);

  statusMessage = '';
  isSubmitting = false;
  form = this.fb.group({
    pdf: [null as File | null],
    image: [null as File | null],
    url: ['']
  });

  onFileChange(event: Event, control: 'pdf' | 'image'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    this.form.patchValue({ [control]: file });
  }

  async submit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const userId = this.session.getCurrentUserId();
    if (!userId) {
      this.statusMessage = 'Connectez-vous pour lancer une extraction.';
      await this.router.navigate(['/signin']);
      return;
    }

    const { pdf, image, url } = this.form.value;
    if (!pdf && !image && !url) {
      this.statusMessage = 'Ajoutez un fichier ou une URL avant de lancer une extraction.';
      return;
    }

    this.isSubmitting = true;
    this.statusMessage = 'Extraction en cours...';
    try {
      const payload = new FormData();
      if (pdf) {
        payload.append('pdf', pdf);
      }
      if (image) {
        payload.append('image', image);
      }
      if (url) {
        payload.append('url', url);
      }
      const job = await this.api.submitExtraction(payload);
      const label = job?.title ?? 'Offre';
      this.statusMessage = `Extraction terminee. ${label} enregistree.`;
      this.router.navigate(['/results']);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.statusMessage = 'Le serveur na pas pu traiter cette extraction.';
      } else if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.statusMessage = 'Session expirée. Connectez-vous a nouveau.';
        this.session.clear();
        await this.router.navigate(['/signin']);
      } else {
        console.error(error);
        this.statusMessage = 'Une erreur est survenue lors de lextraction.';
      }
    } finally {
      this.isSubmitting = false;
    }
  }
}
