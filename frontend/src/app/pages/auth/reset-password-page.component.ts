import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../services/auth-api.service';
import { LanguageService, UiLanguage } from '../../services/language.service';

type ResetErrorKey = 'tokenMissing' | 'mismatch' | 'generic';

interface ResetCopy {
  badge: string;
  title: string;
  subtitle: string;
  fields: {
    passwordLabel: string;
    passwordPlaceholder: string;
    passwordError: string;
    confirmLabel: string;
    confirmPlaceholder: string;
    confirmError: string;
  };
  cta: string;
  ctaLoading: string;
  success: string;
  footerPrompt: string;
  footerLink: string;
  errors: Record<ResetErrorKey, string>;
}

const RESET_COPY: Record<UiLanguage, ResetCopy> = {
  en: {
    badge: 'Password reset',
    title: 'Choose a new password',
    subtitle: 'Create a secure password to regain access to your account.',
    fields: {
      passwordLabel: 'New password',
      passwordPlaceholder: 'Minimum 6 characters',
      passwordError: 'Password must contain at least 6 characters.',
      confirmLabel: 'Confirm password',
      confirmPlaceholder: 'Repeat your new password',
      confirmError: 'Passwords must match.'
    },
    cta: 'Update password',
    ctaLoading: 'Updating...',
    success: 'Password updated. You can now sign in.',
    footerPrompt: 'Ready to go back?',
    footerLink: 'Return to sign in',
    errors: {
      tokenMissing: 'Invalid or missing reset link.',
      mismatch: 'Passwords must match.',
      generic: 'Unable to reset the password. The link may have expired.'
    }
  },
  fr: {
    badge: 'Reinitialisation',
    title: 'Choisissez un nouveau mot de passe',
    subtitle: 'Creez un mot de passe securise pour retrouver l acces a votre compte.',
    fields: {
      passwordLabel: 'Nouveau mot de passe',
      passwordPlaceholder: 'Minimum 6 caracteres',
      passwordError: 'Le mot de passe doit contenir au moins 6 caracteres.',
      confirmLabel: 'Confirmez le mot de passe',
      confirmPlaceholder: 'Repetez votre mot de passe',
      confirmError: 'Les mots de passe doivent correspondre.'
    },
    cta: 'Mettre a jour',
    ctaLoading: 'Mise a jour...',
    success: 'Mot de passe mis a jour. Vous pouvez vous connecter.',
    footerPrompt: 'Pret a revenir ?',
    footerLink: 'Retour a la connexion',
    errors: {
      tokenMissing: 'Lien invalide ou manquant.',
      mismatch: 'Les mots de passe doivent correspondre.',
      generic: 'Impossible de reinitialiser le mot de passe. Le lien a pu expirer.'
    }
  }
};

@Component({
  standalone: true,
  selector: 'app-reset-password-page',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password-page.component.html',
  styleUrls: ['./auth-page.shared.css']
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  text: ResetCopy = RESET_COPY[this.languageService.getCurrentLanguage()];
  token: string | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  private lastErrorKey: ResetErrorKey | null = null;

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required]]
  });

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.text = RESET_COPY[language];
        this.errorMessage = this.lastErrorKey ? this.text.errors[this.lastErrorKey] : '';
        if (this.successMessage) {
          this.successMessage = this.text.success;
        }
      });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.setError('tokenMissing');
      this.form.disable();
    }
  }

  async submit(): Promise<void> {
    if (this.loading || this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      if (!this.token) {
        this.setError('tokenMissing');
      }
      return;
    }
    if (this.passwordsMismatch) {
      this.setError('mismatch');
      return;
    }
    this.loading = true;
    this.setError(null);
    this.successMessage = '';

    try {
      await this.authApi.resetPassword(this.token, this.form.value.password ?? '');
      this.successMessage = this.text.success;
      this.form.disable();
    } catch (error) {
      console.error(error);
      this.setError('generic');
    } finally {
      this.loading = false;
    }
  }

  async goToSignIn(): Promise<void> {
    await this.router.navigate(['/signin']);
  }

  get passwordsMismatch(): boolean {
    const password = this.form.value.password ?? '';
    const confirm = this.form.value.confirm ?? '';
    return password.length > 0 && confirm.length > 0 && password !== confirm;
  }

  get confirmErrorVisible(): boolean {
    const control = this.form.controls.confirm;
    return control.touched && (control.invalid || this.passwordsMismatch);
  }

  private setError(key: ResetErrorKey | null): void {
    this.lastErrorKey = key;
    this.errorMessage = key ? this.text.errors[key] : '';
  }
}

