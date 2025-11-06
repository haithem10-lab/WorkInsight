import { Component, DestroyRef, HostListener, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { AuthSessionService, SessionUser } from '../../services/auth-session.service';
import { LanguageService, UiLanguage } from '../../services/language.service';
import { ThemeMode, ThemeService } from '../../services/theme.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface NavbarCopy {
  home: string;
  about: string;
  features: string;
  workflow: string;
  templates: string;
  faq: string;
  themeLight: string;
  themeDark: string;
  login: string;
  startFree: string;
  profile: string;
  results: string;
  logout: string;
  languageNames: Record<UiLanguage, string>;
}

const NAVBAR_COPY: Record<UiLanguage, NavbarCopy> = {
  en: {
    home: 'Home',
    about: 'About',
    features: 'Features',
    workflow: 'Workflow',
    templates: 'Templates',
    faq: 'FAQ',
    themeLight: 'Switch to light mode',
    themeDark: 'Switch to dark mode',
    login: 'Login',
    startFree: 'Start for free',
    profile: 'Profile',
    results: 'Results',
    logout: 'Logout',
    languageNames: {
      en: 'English',
      fr: 'French'
    }
  },
  fr: {
    home: 'Accueil',
    about: 'A propos',
    features: 'Fonctionnalites',
    workflow: 'Flux de travail',
    templates: 'Modeles',
    faq: 'FAQ',
    themeLight: 'Activer le mode clair',
    themeDark: 'Activer le mode sombre',
    login: 'Connexion',
    startFree: 'Commencer gratuitement',
    profile: 'Profil',
    results: 'Resultats',
    logout: 'Se deconnecter',
    languageNames: {
      en: 'Anglais',
      fr: 'Francais'
    }
  }
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf, NgFor, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  constructor(
    private readonly session: AuthSessionService,
    private readonly router: Router,
    private readonly languageService: LanguageService,
    private readonly themeService: ThemeService
  ) {}

  private readonly destroyRef = inject(DestroyRef);
  mobileMenuOpen = false;
  scrolled = false;
  private previousScrollY = 0;
  navHidden = false;
  userMenuOpen = false;
  languageMenuOpen = false;
  readonly languages: UiLanguage[] = ['en', 'fr'];
  selectedLanguage: UiLanguage = this.languageService.getCurrentLanguage();
  readonly currentUser$ = this.session.currentUser$;
  currentTheme: ThemeMode = this.themeService.getCurrentTheme();

  ngOnInit(): void {
    this.scrolled = window.scrollY > 24;
    this.previousScrollY = window.scrollY;
    this.languageService.language$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(lang => {
        this.selectedLanguage = lang;
      });

    this.themeService.theme$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  get text(): NavbarCopy {
    return NAVBAR_COPY[this.selectedLanguage];
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  get themeToggleLabel(): string {
    return this.currentTheme === 'dark' ? this.text.themeLight : this.text.themeDark;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.navHidden = false;
      this.userMenuOpen = false;
      this.languageMenuOpen = false;
    }
  }

  closeMobileMenus(): void {
    this.mobileMenuOpen = false;
    this.userMenuOpen = false;
    this.navHidden = false;
    this.languageMenuOpen = false;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 960 && this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    const currentY = window.scrollY || 0;
    const hasScrolled = currentY > 24;
    const scrollingDown = currentY > this.previousScrollY;
    const shouldHide = currentY > 120 && scrollingDown && !this.mobileMenuOpen;

    if (this.scrolled !== hasScrolled) {
      this.scrolled = hasScrolled;
    }

    if (this.navHidden !== shouldHide) {
      this.navHidden = shouldHide;
    }
    if (shouldHide && this.userMenuOpen) {
      this.userMenuOpen = false;
    }

    this.previousScrollY = currentY <= 0 ? 0 : currentY;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.userMenuOpen) {
      this.userMenuOpen = false;
    }
    if (this.languageMenuOpen) {
      this.languageMenuOpen = false;
    }
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  navigateTo(path: string): void {
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
    const target = path.startsWith('/') ? path : `/${path}`;
    this.router.navigate([target]);
  }

  logout(): void {
    this.session.clear();
    this.userMenuOpen = false;
    this.mobileMenuOpen = false;
    this.router.navigate(['/']);
  }

  getUserInitial(user: SessionUser): string {
    const basis = user.fullName?.trim() || user.email;
    return basis ? basis.charAt(0).toUpperCase() : '?';
  }

  getUserGreeting(user: SessionUser): string {
    if (user.fullName && user.fullName.trim().length > 0) {
      const parts = user.fullName.trim().split(/\s+/);
      return parts[0];
    }
    return user.email;
  }

  toggleLanguageMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.languageMenuOpen = !this.languageMenuOpen;
    if (this.languageMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  setLanguage(code: UiLanguage): void {
    this.languageService.setLanguage(code);
    this.languageMenuOpen = false;
    this.mobileMenuOpen = false;
  }
}


