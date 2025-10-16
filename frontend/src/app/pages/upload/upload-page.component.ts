import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ExtractionApiService } from '../../services/extraction-api.service';

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
      await this.api.submitExtraction(payload);
      this.statusMessage = 'Extraction terminée !';
      this.router.navigate(['/results']);
    } catch (error) {
      console.error(error);
      this.statusMessage = "Une erreur est survenue lors de l'extraction.";
    } finally {
      this.isSubmitting = false;
    }
  }
}
