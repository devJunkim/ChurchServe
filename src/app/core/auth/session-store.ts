import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { CurrentUser, SignInCommand } from './current-user';
import { parseCurrentUser } from './session-dto';
import { normalizeHttpProblem, toAppProblem } from '../http/app-problem';

export type SessionState =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'unavailable'; message: string };

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly state = signal<SessionState>({ status: 'checking' });
  private restoreRequest: Observable<SessionState> | undefined;

  readonly session = this.state.asReadonly();

  restore(): Observable<void> {
    this.state.set({ status: 'checking' });
    return this.restoreSession().pipe(map(() => undefined));
  }

  ensureRestored(): Observable<SessionState> {
    const current = this.state();
    return current.status === 'checking' ? this.restoreSession() : of(current);
  }

  private restoreSession(): Observable<SessionState> {
    if (this.restoreRequest) {
      return this.restoreRequest;
    }

    const request = this.http.get<unknown>('/api/session').pipe(
      map(parseCurrentUser),
      map((user): SessionState => ({ status: 'authenticated', user })),
      catchError((error: unknown) => {
        if (toAppProblem(error).kind === 'unauthenticated') {
          return of<SessionState>({ status: 'anonymous' });
        }

        return of<SessionState>({
          status: 'unavailable',
          message: 'ChurchServe could not verify your session.',
        });
      }),
      tap((session) => this.state.set(session)),
      finalize(() => {
        if (this.restoreRequest === request) {
          this.restoreRequest = undefined;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.restoreRequest = request;
    return request;
  }

  signIn(command: SignInCommand): Observable<void> {
    return this.http.post<unknown>('/api/session/sign-in', command).pipe(
      map(parseCurrentUser),
      tap((user) => this.state.set({ status: 'authenticated', user })),
      map(() => undefined),
      normalizeHttpProblem(),
    );
  }

  signOut(): Observable<void> {
    return this.http.delete<void>('/api/session').pipe(
      tap(() => this.state.set({ status: 'anonymous' })),
      map(() => undefined),
      normalizeHttpProblem(),
    );
  }
}
