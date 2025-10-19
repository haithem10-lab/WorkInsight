import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSessionService } from '../../services/auth-session.service';
import { AuthApiService } from '../../services/auth-api.service';

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

  errorMessage = '';
  loading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true]
  });

  async submit(): Promise<void> {
    if (this.loading || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

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
          this.errorMessage = 'Identifiants invalides. Verifiez votre email et mot de passe.';
        } else {
          this.errorMessage = 'Impossible de se connecter pour le moment. Veuillez reessayer.';
        }
      } else if (error instanceof Error && error.message === 'NO_ACTIVE_USER') {
        this.errorMessage = 'Impossible de recuperer votre session.';
      } else {
        console.error(error);
        this.errorMessage = 'Impossible de se connecter pour le moment. Veuillez reessayer.';
      }
    } finally {
      this.loading = false;
    }
  }
}
