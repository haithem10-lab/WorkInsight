import { Component, HostListener, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { AuthSessionService, SessionUser } from '../../services/auth-session.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NgIf, AsyncPipe],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
  constructor(
    private readonly session: AuthSessionService,
    private readonly router: Router
  ) {}

  mobileMenuOpen = false;
  scrolled = false;
  private previousScrollY = 0;
  navHidden = false;
  userMenuOpen = false;
  readonly currentUser$ = this.session.currentUser$;

  ngOnInit(): void {
    this.scrolled = window.scrollY > 24;
    this.previousScrollY = window.scrollY;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.navHidden = false;
      this.userMenuOpen = false;
    }
  }

  closeMobileMenus(): void {
    this.mobileMenuOpen = false;
    this.userMenuOpen = false;
    this.navHidden = false;
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
}
