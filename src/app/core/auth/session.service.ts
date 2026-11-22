import { computed, inject, Service, signal } from '@angular/core';
import { catchError, finalize, firstValueFrom, map, Observable, of, shareReplay, tap } from 'rxjs';
import { GoogleLoginRequest, Login, UserDetails, UserLogin } from '../api/generated';
import { AuthService } from '../../shared/services/auth.service';

export const MANAGER_ROLE = 'Manager';

interface Session {
  token: string;
  user: UserDetails;
}

/**
 * Session de l'utilisateur connecté.
 * Le JWT d'accès ne vit qu'en mémoire (jamais de storage) ; il est renouvelé par le cookie
 * `refreshToken` HttpOnly que pose l'API, en attendant la session par cookie (ADR-0002).
 */
@Service()
export class SessionService {
  private readonly auth = inject(AuthService);
  private readonly session = signal<Session | null>(null);
  private refreshing: Observable<string> | null = null;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly needsActivation = computed(() => this.user()?.emailConfirmed === false);
  /** Sert à masquer l'interface uniquement : le serveur vérifie le rôle à chaque appel. */
  readonly isManager = computed(
    () => this.user()?.roles.some((role) => role.name === MANAGER_ROLE) ?? false,
  );

  accessToken(): string | null {
    return this.session()?.token ?? null;
  }

  login(credentials: UserLogin): Observable<UserDetails> {
    return this.auth.login(credentials).pipe(
      tap((login) => this.open(login)),
      map((login) => login.user),
    );
  }

  loginWithGoogle(request: GoogleLoginRequest): Observable<UserDetails> {
    return this.auth.loginWithGoogle(request).pipe(
      tap((login) => this.open(login)),
      map((login) => login.user),
    );
  }

  /** Reprend la session au démarrage grâce au cookie ; reste anonyme en cas d'échec. */
  restore(): Promise<void> {
    return firstValueFrom(
      this.refresh().pipe(
        map(() => undefined),
        catchError(() => of(undefined)),
      ),
    );
  }

  /** Nouveau jeton d'accès ; les appels simultanés partagent la même requête. */
  refresh(): Observable<string> {
    this.refreshing ??= this.auth.refreshToken().pipe(
      tap((login) => this.open(login)),
      map((login) => login.token),
      finalize(() => (this.refreshing = null)),
      shareReplay(1),
    );
    return this.refreshing;
  }

  logout(): Observable<void> {
    return this.auth.logout().pipe(
      catchError(() => of(undefined)),
      finalize(() => this.clear()),
    );
  }

  /** Oublie la session côté client (jeton expiré et non renouvelable). */
  clear(): void {
    this.session.set(null);
  }

  private open(login: Login): void {
    this.session.set({ token: login.token, user: login.user });
  }
}
