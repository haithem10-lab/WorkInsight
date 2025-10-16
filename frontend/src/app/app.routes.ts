import { Routes } from '@angular/router';
import { UploadPageComponent } from './pages/upload/upload-page.component';
import { ResultsPageComponent } from './pages/results/results-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'upload' },
  { path: 'upload', component: UploadPageComponent },
  { path: 'results', component: ResultsPageComponent },
  { path: '**', redirectTo: 'upload' }
];
