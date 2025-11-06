import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSessionService } from '../../services/auth-session.service';
import { AuthApiService } from '../../services/auth-api.service';
import { LanguageService, UiLanguage } from '../../services/language.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type SignUpErrorKey = 'conflict' | 'generic';

interface SignUpCopy {
  badge: string;
  title: string;
  subtitle: string;
  fields: {
    fullNameLabel: string;
    fullNamePlaceholder: string;
    fullNameError: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailError: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordError: string;
  };
  agreeLabel: string;
  cta: string;
  ctaLoading: string;
  footerPrompt: string;
  footerLink: string;
  errors: Record<SignUpErrorKey, string>;
}

const SIGN_UP_COPY: Record<UiLanguage, SignUpCopy> = {
  en: {
    badge: 'Free 14-day trial',
    title: 'Create your account',
    subtitle: 'Start automating your recruitment data flows in minutes. No credit card required.',
    fields: {
      fullNameLabel: 'Full name',
      fullNamePlaceholder: 'Taylor Reed',
      fullNameError: 'Please enter your name.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@company.com',
      emailError: 'Enter a valid email address.',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Minimum 6 characters',
      passwordError: 'Password must contain at least 6 characters.'
    },
    agreeLabel: 'I agree to the WorkInsight terms of service.',
    cta: 'Create account',
    ctaLoading: 'Creating...',
    footerPrompt: 'Already have an account?',
    footerLink: 'Sign in',
    errors: {
      conflict: 'An account already exists for this email address.',
      generic: 'Cannot create your account right now. Please try again later.'
    }
  },
  fr: {
    badge: 'Essai gratuit 14 jours',
    title: 'Créez votre compte',
    subtitle: 'Automatisez vos flux de données de recrutement en quelques minutes. Aucune carte requise.',
    fields: {
      fullNameLabel: 'Nom complet',
      fullNamePlaceholder: 'Taylor Reed',
      fullNameError: 'Veuillez saisir votre nom.',
      emailLabel: 'Email',
      emailPlaceholder: 'vous@entreprise.com',
      emailError: 'Entrez une adresse e-mail valide.',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: 'Minimum 6 caractères',
      passwordError: 'Le mot de passe doit contenir au moins 6 caractères.'
    },
    agreeLabel: 'J\'accepte les conditions d\'utilisation WorkInsight.',
    cta: 'Créer le compte',
    ctaLoading: 'Création en cours...',
    footerPrompt: 'Vous avez déjà un compte ?',
    footerLink: 'Se connecter',
    errors: {
      conflict: 'Un compte existe déjà avec cette adresse e-mail.',
      generic: 'Impossible de créer votre compte pour le moment. Veuillez réessayer.'
    }
  }
};

@Component({
  standalone: true,
  selector: 'app-sign-up-page',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sign-up-page.component.html',
  styleUrls: ['./auth-page.shared.css']
})
export class SignUpPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);
  private readonly authApi = inject(AuthApiService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  text: SignUpCopy = SIGN_UP_COPY[this.languageService.getCurrentLanguage()];
  loading = false;
  errorMessage = '';
  private lastErrorKey: SignUpErrorKey | null = null;

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    agree: [false, Validators.requiredTrue]
  });

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.text = SIGN_UP_COPY[language];
        this.errorMessage = this.lastErrorKey ? this.text.errors[this.lastErrorKey] : '';
      });
  }

  async submit(): Promise<void> {
    if (this.loading || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.setError(null);

    try {
      const fullName = (this.form.value.fullName ?? '').trim();
      const email = (this.form.value.email ?? '').trim();
      const password = this.form.value.password ?? '';
      const user = await this.authApi.signUp({
        fullName,
        email,
        password
      });
      this.session.setCurrentUser(user);
      this.router.navigate(['/']);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        this.setError('conflict');
      } else {
        console.error(error);
        this.setError('generic');
      }
    } finally {
      this.loading = false;
    }
  }

  private setError(key: SignUpErrorKey | null): void {
    this.lastErrorKey = key;
    this.errorMessage = key ? this.text.errors[key] : '';
  }
}
