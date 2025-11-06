import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ExtractionApiService, NO_ACTIVE_USER_ERROR } from '../../services/extraction-api.service';
import { AuthSessionService } from '../../services/auth-session.service';
import { LanguageService, UiLanguage } from '../../services/language.service';
import { NotificationService } from '../../services/notification.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type UploadStatusKey =
  | 'signInRequired'
  | 'missingInput'
  | 'inProgress'
  | 'success'
  | 'serverError'
  | 'sessionExpired'
  | 'genericError';

type PipelineKey = 'pdf' | 'image' | 'document' | 'spreadsheet' | 'csv' | 'json';

interface UploadStatusState {
  key: UploadStatusKey;
  context?: {
    offer?: string;
  };
}

interface UploadCopy {
  heading: string;
  subtitle: string;
  labels: {
    file: string;
    url: string;
  };
  placeholders: {
    url: string;
  };
  detectionHint: string;
  submitStates: {
    idle: string;
    submitting: string;
  };
  statusMessages: {
    signInRequired: string;
    missingInput: string;
    inProgress: string;
    serverError: string;
    sessionExpired: string;
    genericError: string;
  };
  successTemplate: string;
  fallbackOffer: string;
}

const UPLOAD_COPY: Record<UiLanguage, UploadCopy> = {
  en: {
    heading: 'Submit a new offer',
    subtitle: 'Upload a PDF, image, document, spreadsheet, CSV or JSON file, or paste a job URL.',
    labels: {
      file: 'Upload file',
      url: 'Job URL'
    },
    placeholders: {
      url: 'https://...'
    },
    detectionHint: 'Detected source pipeline',
    submitStates: {
      idle: 'Launch extraction',
      submitting: 'Submitting...'
    },
    statusMessages: {
      signInRequired: 'Sign in to launch an extraction.',
      missingInput: 'Add a file or URL before submitting.',
      inProgress: 'Extraction in progress...',
      serverError: 'The server could not process this extraction.',
      sessionExpired: 'Session expired. Please sign in again.',
      genericError: 'Something went wrong while running the extraction.'
    },
    successTemplate: 'Extraction complete. {offer} stored.',
    fallbackOffer: 'Offer'
  },
  fr: {
    heading: 'Soumettre une nouvelle offre',
    subtitle: 'Deposez un PDF, une image, un document, une feuille de calcul, un fichier CSV ou JSON, ou collez une URL.',
    labels: {
      file: 'Importer un fichier',
      url: 'URL de l\'offre'
    },
    placeholders: {
      url: 'https://...'
    },
    detectionHint: 'Pipeline detecte',
    submitStates: {
      idle: 'Lancer l\'extraction',
      submitting: 'Envoi en cours...'
    },
    statusMessages: {
      signInRequired: 'Connectez-vous pour lancer une extraction.',
      missingInput: 'Ajoutez un fichier ou une URL avant de lancer une extraction.',
      inProgress: 'Extraction en cours...',
      serverError: 'Le serveur n\'a pas pu traiter cette extraction.',
      sessionExpired: 'Session expiree. Connectez-vous a nouveau.',
      genericError: 'Une erreur est survenue lors de l\'extraction.'
    },
    successTemplate: 'Extraction terminee. {offer} enregistree.',
    fallbackOffer: 'Offre'
  }
};

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
  private readonly languageService = inject(LanguageService);
  private readonly notifications = inject(NotificationService);
  private readonly preferences = inject(UserPreferencesService);
  private readonly destroyRef = inject(DestroyRef);

  text: UploadCopy = UPLOAD_COPY[this.languageService.getCurrentLanguage()];
  statusMessage = '';
  private lastStatus: UploadStatusState | null = null;
  isSubmitting = false;
  private readonly lowConfidenceThreshold = 0.6;

  private readonly sourceLabels: Record<UiLanguage, Record<PipelineKey, string>> = {
    en: {
      pdf: 'PDF pack',
      image: 'Screenshot',
      document: 'Document',
      spreadsheet: 'Spreadsheet',
      csv: 'CSV dataset',
      json: 'JSON payload'
    },
    fr: {
      pdf: 'Pack PDF',
      image: 'Capture',
      document: 'Document',
      spreadsheet: 'Feuille de calcul',
      csv: 'Jeu de donnees CSV',
      json: 'Fichier JSON'
    }
  };

  private currentLanguage: UiLanguage = this.languageService.getCurrentLanguage();

  detectedPipeline: PipelineKey | null = null;
  detectedLabel = '';

  form = this.fb.group({
    file: [null as File | null],
    url: ['']
  });

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.text = UPLOAD_COPY[language];
        this.currentLanguage = language;
        this.statusMessage = this.formatStatus(this.lastStatus);
        if (this.detectedPipeline) {
          this.detectedLabel = this.sourceLabels[this.currentLanguage][this.detectedPipeline];
        }
      });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    this.form.patchValue({ file });
    this.updateDetection(file);
  }

  async submit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const userId = this.session.getCurrentUserId();
    if (!userId) {
      this.setStatus({ key: 'signInRequired' });
      await this.router.navigate(['/signin']);
      return;
    }

    const { file, url } = this.form.value;
    const trimmedUrl = typeof url === 'string' ? url.trim() : '';
    if (!file && !trimmedUrl) {
      this.setStatus({ key: 'missingInput' });
      return;
    }

    this.isSubmitting = true;
    this.setStatus({ key: 'inProgress' });
    try {
      const payload = new FormData();
      if (file) {
        const pipeline = this.detectPipeline(file);
        payload.append(pipeline, file);
      }
      if (trimmedUrl) {
        payload.append('url', trimmedUrl);
      }
      const job = await this.api.submitExtraction(payload);
      const label = job?.title ?? this.text.fallbackOffer;
      this.setStatus({ key: 'success', context: { offer: label } });
      this.sendSuccessNotifications(userId, label, job?.confidenceScore ?? null);
      this.router.navigate(['/results']);
      this.form.reset({
        file: null,
        url: ''
      });
      this.detectedPipeline = null;
      this.detectedLabel = '';
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        this.setStatus({ key: 'serverError' });
      } else if (error instanceof Error && error.message === NO_ACTIVE_USER_ERROR) {
        this.setStatus({ key: 'sessionExpired' });
        this.session.clear();
        await this.router.navigate(['/signin']);
      } else {
        console.error(error);
        this.setStatus({ key: 'genericError' });
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  private setStatus(entry: UploadStatusState | null): void {
    this.lastStatus = entry;
    this.statusMessage = this.formatStatus(entry);
  }

  private formatStatus(entry: UploadStatusState | null): string {
    if (!entry) {
      return '';
    }
    if (entry.key === 'success') {
      const offerLabel = entry.context?.offer ?? this.text.fallbackOffer;
      return this.text.successTemplate.replace('{offer}', offerLabel);
    }
    return this.text.statusMessages[entry.key];
  }

  private sendSuccessNotifications(userId: string, offerLabel: string, confidence: number | null): void {
    const preferences = this.preferences.get(userId);
    const title = offerLabel || this.text.fallbackOffer;

    this.notifications.notify(`${title} saved successfully.`, 'success', 7500);

    if (
      preferences.alertLowConfidence &&
      typeof confidence === 'number' &&
      confidence >= 0 &&
      confidence < this.lowConfidenceThreshold
    ) {
      const percent = Math.round(confidence * 100);
      this.notifications.notify(
        `${title} confidence is ${percent}%. Review the extracted data for accuracy.`,
        'warning',
        12000
      );
    }
  }

  private updateDetection(file: File | null): void {
    if (!file) {
      this.detectedPipeline = null;
      this.detectedLabel = '';
      return;
    }
    const pipeline = this.detectPipeline(file);
    this.detectedPipeline = pipeline;
    this.detectedLabel = this.sourceLabels[this.currentLanguage][pipeline];
  }

  private detectPipeline(file: File): PipelineKey {
    const name = file.name.toLowerCase();
    const extension = name.includes('.') ? name.substring(name.lastIndexOf('.') + 1) : '';
    const extMap: Record<string, PipelineKey> = {
      pdf: 'pdf',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      webp: 'image',
      gif: 'image',
      doc: 'document',
      docx: 'document',
      rtf: 'document',
      txt: 'document',
      odt: 'document',
      xls: 'spreadsheet',
      xlsx: 'spreadsheet',
      ods: 'spreadsheet',
      csv: 'csv',
      json: 'json'
    };
    if (extension && extMap[extension]) {
      return extMap[extension];
    }

    const type = file.type.toLowerCase();
    if (type.includes('pdf')) {
      return 'pdf';
    }
    if (type.startsWith('image/')) {
      return 'image';
    }
    if (type.includes('spreadsheet') || type.includes('excel')) {
      return 'spreadsheet';
    }
    if (type.includes('csv')) {
      return 'csv';
    }
    if (type.includes('json')) {
      return 'json';
    }
    return 'document';
  }
}
