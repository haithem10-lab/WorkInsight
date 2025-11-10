import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { extractionApiInterceptor } from './app/services/api.interceptor';
import { authTokenInterceptor } from './app/services/auth-token.interceptor';

registerLocaleData(localeFr, 'fr-FR');

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      })
    ),
    provideHttpClient(withInterceptors([authTokenInterceptor, extractionApiInterceptor]))
  ]
}).catch((err) => console.error(err));
