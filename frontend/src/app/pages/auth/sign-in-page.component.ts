import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSessionService } from '../../services/auth-session.service';
import { AuthApiService } from '../../services/auth-api.service';
import { LanguageService, UiLanguage } from '../../services/language.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

type SignInErrorKey = 'invalidCredentials' | 'generic' | 'session';

interface SignInCopy {
  badge: string;
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailError: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordError: string;
  remember: string;
  cta: string;
  ctaLoading: string;
  footerPrompt: string;
  footerLink: string;
  errors: Record<SignInErrorKey, string>;
}

const SIGN_IN_COPY: Record<UiLanguage, SignInCopy> = {
  en: {
    badge: 'Recruiting intelligence',
    title: 'Welcome back',
    subtitle: 'Sign in to orchestrate data collection across every job source in your workflow.',
    emailLabel: 'Email',
    emailPlaceholder: 'you@company.com',
    emailError: 'Enter a valid email.',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Minimum 6 characters',
    passwordError: 'Password must contain at least 6 characters.',
    remember: 'Remember me',
    cta: 'Sign in',
    ctaLoading: 'Signing in...',
    footerPrompt: 'New to WorkInsight?',
    footerLink: 'Create an account',
    errors: {
      invalidCredentials: 'Invalid credentials. Check your email and password.',
      generic: 'Cannot sign in right now. Please try again.',
      session: 'Unable to retrieve your session.'
    }
  },
  fr: {
    badge: 'Intelligence recrutement',
    title: 'Heureux de vous revoir',
    subtitle: 'Connectez-vous pour orchestrer la collecte de données sur toutes vos sources d\'offres.',
    emailLabel: 'Email',
    emailPlaceholder: 'vous@entreprise.com',
    emailError: 'Saisissez un email valide.',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Minimum 6 caractères',
    passwordError: 'Le mot de passe doit contenir au moins 6 caractères.',
    remember: 'Se souvenir de moi',
    cta: 'Se connecter',
    ctaLoading: 'Connexion...',
    footerPrompt: 'Nouveau sur WorkInsight ?',
    footerLink: 'Créer un compte',
    errors: {
      invalidCredentials: 'Identifiants invalides. Vérifiez votre email et mot de passe.',
      generic: 'Impossible de se connecter pour le moment. Veuillez réessayer.',
      session: 'Impossible de récupérer votre session.'
    }
  }
};

@Component({
  standalone: true,
  selector: 'app-sign-in-page',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './sign-in-page.component.html',
  styleUrls: ['./auth-page.shared.css']
})
export class SignInPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);
  private readonly authApi = inject(AuthApiService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  text: SignInCopy = SIGN_IN_COPY[this.languageService.getCurrentLanguage()];
  errorMessage = '';
  private lastErrorKey: SignInErrorKey | null = null;
  loading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true]
  });

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.text = SIGN_IN_COPY[language];
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
      const email = (this.form.value.email ?? '').trim();
      const password = this.form.value.password ?? '';
      const user = await this.authApi.signIn({
        email,
        password
      });
      this.session.setCurrentUser(user);
      this.router.navigate(['/']);
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          this.setError('invalidCredentials');
        } else {
          this.setError('generic');
        }
      } else if (error instanceof Error && error.message === 'NO_ACTIVE_USER') {
        this.setError('session');
      } else {
        console.error(error);
        this.setError('generic');
      }
    } finally {
      this.loading = false;
    }
  }

  private setError(key: SignInErrorKey | null): void {
    this.lastErrorKey = key;
    this.errorMessage = key ? this.text.errors[key] : '';
  }
}
