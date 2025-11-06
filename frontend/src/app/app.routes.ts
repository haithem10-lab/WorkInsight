import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home/home-page.component';
import { UploadPageComponent } from './pages/upload/upload-page.component';
import { ResultsPageComponent } from './pages/results/results-page.component';
import { SignInPageComponent } from './pages/auth/sign-in-page.component';
import { SignUpPageComponent } from './pages/auth/sign-up-page.component';
import { ProfilePageComponent } from './pages/profile/profile-page.component';
import { MatchesPageComponent } from './pages/matches/matches-page.component';

export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'upload', component: UploadPageComponent },
  { path: 'results', component: ResultsPageComponent },
  { path: 'profile', component: ProfilePageComponent },
  { path: 'matches', component: MatchesPageComponent },
  { path: 'signin', component: SignInPageComponent },
  { path: 'signup', component: SignUpPageComponent },
  { path: '**', redirectTo: '' }
];
