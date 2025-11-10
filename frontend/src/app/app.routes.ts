import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { UploadPageComponent } from './pages/upload/upload-page.component';
import { ResultsPageComponent } from './pages/results/results-page.component';
import { SignInPageComponent } from './pages/auth/sign-in-page.component';
import { SignUpPageComponent } from './pages/auth/sign-up-page.component';
import { ProfilePageComponent } from './pages/profile/profile-page.component';
import { MatchesPageComponent } from './pages/matches/matches-page.component';
import { ForgotPasswordPageComponent } from './pages/auth/forgot-password-page.component';
import { ResetPasswordPageComponent } from './pages/auth/reset-password-page.component';
import { VerifyEmailPageComponent } from './pages/auth/verify-email-page.component';
import { AdminUsersPageComponent } from './pages/admin/admin-users-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'upload', component: UploadPageComponent },
  { path: 'results', component: ResultsPageComponent },
  { path: 'profile', component: ProfilePageComponent },
  { path: 'matches', component: MatchesPageComponent },
  { path: 'signin', component: SignInPageComponent },
  { path: 'signup', component: SignUpPageComponent },
  { path: 'verify-email', component: VerifyEmailPageComponent },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'admin', component: AdminUsersPageComponent },
  { path: '**', redirectTo: '' }
];
