import { Component, DestroyRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavbarComponent } from './components/navbar/navbar.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { LanguageService, UiLanguage } from './services/language.service';
import { ThemeMode, ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, NotificationCenterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  host: {
    '[attr.data-lang]': 'currentLanguage',
    '[attr.data-theme]': 'currentTheme'
  }
})
export class AppComponent {
  private readonly languageService = inject(LanguageService);
  private readonly themeService = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);

  currentLanguage: UiLanguage = this.languageService.getCurrentLanguage();
  currentTheme: ThemeMode = this.themeService.getCurrentTheme();

  constructor() {
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(language => {
        this.currentLanguage = language;
      });

    this.themeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }
}
