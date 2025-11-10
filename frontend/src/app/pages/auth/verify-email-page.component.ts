import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../services/auth-api.service';
import { LanguageService, UiLanguage } from '../../services/language.service';

type VerifyState = 'pending' | 'success' | 'error';

interface VerifyCopy {
  badge: string;
  pendingTitle: string;
  pendingMessage: string;
  successTitle: string;
  successMessage: string;
  errorTitle: string;
  errorMessage: string;
  cta: string;
}

const VERIFY_COPY: Record<UiLanguage, VerifyCopy> = {
  en: {
    badge: 'Account verification',
    pendingTitle: 'Please wait',
    pendingMessage: 'We are confirming your email...',
    successTitle: 'Email verified',
    successMessage: 'Success! You can now sign in and start submitting offers.',
    errorTitle: 'Verification failed',
    errorMessage: 'We could not verify this token. It may have expired.',
    cta: 'Go to sign in'
  },
  fr: {
    badge: 'Verification du compte',
    pendingTitle: 'Merci de patienter',
    pendingMessage: 'Nous confirmons votre adresse email...',
    successTitle: 'Email verifie',
    successMessage: 'Succes ! Vous pouvez maintenant vous connecter.',
    errorTitle: 'Echec de verification',
    errorMessage: 'Impossible de verifier ce jeton. Il a pu expirer.',
    cta: 'Aller a la connexion'
  }
};

@Component({
  standalone: true,
  selector: 'app-verify-email-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-email-page.component.html',
  styleUrls: ['./auth-page.shared.css']
})
export class VerifyEmailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  text: VerifyCopy = VERIFY_COPY[this.languageService.getCurrentLanguage()];
  state: VerifyState = 'pending';

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.text = VERIFY_COPY[language];
      });
  }

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      return;
    }
    try {
      await this.authApi.verifyEmail(token);
      this.state = 'success';
    } catch (error) {
      console.error(error);
      this.state = 'error';
    }
  }

  get title(): string {
    switch (this.state) {
      case 'success':
        return this.text.successTitle;
      case 'error':
        return this.text.errorTitle;
      default:
        return this.text.pendingTitle;
    }
  }

  get message(): string {
    switch (this.state) {
      case 'success':
        return this.text.successMessage;
      case 'error':
        return this.text.errorMessage;
      default:
        return this.text.pendingMessage;
    }
  }

  get showCta(): boolean {
    return this.state !== 'pending';
  }

  async goToSignIn(): Promise<void> {
    await this.router.navigate(['/signin']);
  }
}

