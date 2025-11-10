import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthApiService } from '../../services/auth-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LanguageService, UiLanguage } from '../../services/language.service';

interface ForgotCopy {
  badge: string;
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailError: string;
  cta: string;
  ctaLoading: string;
  success: string;
  footerPrompt: string;
  footerLink: string;
  errors: {
    generic: string;
  };
}

const FORGOT_COPY: Record<UiLanguage, ForgotCopy> = {
  en: {
    badge: 'Password help',
    title: 'Reset your password',
    subtitle: 'Enter the email tied to your account and we will send you a reset link.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@company.com',
    emailError: 'Enter a valid email.',
    cta: 'Send reset link',
    ctaLoading: 'Sending...',
    success: 'If an account exists for this email, a reset link is on its way.',
    footerPrompt: 'Remembered?',
    footerLink: 'Back to sign in',
    errors: {
      generic: 'Unable to process your request right now. Please try again later.'
    }
  },
  fr: {
    badge: 'Aide mot de passe',
    title: 'Reinitialiser le mot de passe',
    subtitle: 'Entrez l adresse email de votre compte et nous vous enverrons un lien.',
    emailLabel: 'Email',
    emailPlaceholder: 'vous@entreprise.com',
    emailError: 'Entrez un email valide.',
    cta: 'Envoyer le lien',
    ctaLoading: 'Envoi...',
    success: 'Si un compte existe, un lien de reinitialisation vient d etre envoye.',
    footerPrompt: 'Vous vous en souvenez ?',
    footerLink: 'Retour a la connexion',
    errors: {
      generic: 'Impossible de traiter votre demande pour le moment. Veuillez reessayer.'
    }
  }
};

@Component({
  standalone: true,
  selector: 'app-forgot-password-page',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password-page.component.html',
  styleUrls: ['./auth-page.shared.css']
})
export class ForgotPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  text: ForgotCopy = FORGOT_COPY[this.languageService.getCurrentLanguage()];
  successMessage = '';
  errorMessage = '';
  loading = false;
  private hasError = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.text = FORGOT_COPY[language];
        if (this.successMessage) {
          this.successMessage = this.text.success;
        }
        this.errorMessage = this.hasError ? this.text.errors.generic : '';
      });
  }

  async submit(): Promise<void> {
    if (this.loading || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.successMessage = '';
    this.hasError = false;
    this.errorMessage = '';
    try {
      await this.authApi.requestPasswordReset((this.form.value.email ?? '').trim());
      this.successMessage = this.text.success;
    } catch (error) {
      console.error(error);
      this.hasError = true;
      this.errorMessage = this.text.errors.generic;
    } finally {
      this.loading = false;
    }
  }
}
