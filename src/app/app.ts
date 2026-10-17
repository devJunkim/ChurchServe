import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from './core/auth/session-store';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly applicationName = 'ChurchServe';
  protected readonly session = this.sessionStore.session;
  protected readonly authenticatedUser = computed(() => {
    const session = this.session();
    return session.status === 'authenticated' ? session.user : null;
  });
  protected readonly signOutError = signal('');

  protected signOut(): void {
    this.signOutError.set('');
    this.sessionStore.signOut().subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => this.signOutError.set('Sign-out failed. Your session is still active.'),
    });
  }
}
