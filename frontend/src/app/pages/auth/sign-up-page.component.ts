import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSessionService } from '../../services/auth-session.service';
import { AuthApiService } from '../../services/auth-api.service';

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

  loading = false;
  errorMessage = '';

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    agree: [false, Validators.requiredTrue]
  });

  async submit(): Promise<void> {
    if (this.loading || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

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
      if (error instanceof HttpErrorResponse) {
        if (error.status === 409) {
          this.errorMessage = 'Un compte existe deja avec cette adresse e-mail.';
        } else {
          this.errorMessage = 'Impossible de creer votre compte pour le moment.';
        }
      } else {
        console.error(error);
        this.errorMessage = 'Impossible de creer votre compte pour le moment.';
      }
    } finally {
      this.loading = false;
    }
  }
}
