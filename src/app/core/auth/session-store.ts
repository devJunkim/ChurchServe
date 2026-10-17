import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { CurrentUser, SignInCommand } from './current-user';
import { parseCurrentUser } from './session-dto';

export type SessionState =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'unavailable'; message: string };

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly state = signal<SessionState>({ status: 'checking' });

  readonly session = this.state.asReadonly();

  restore(): Observable<void> {
    this.state.set({ status: 'checking' });
    return this.http.get<unknown>('/api/session').pipe(
      map(parseCurrentUser),
      tap((user) => this.state.set({ status: 'authenticated', user })),
      map(() => undefined),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.state.set({ status: 'anonymous' });
        } else {
          this.state.set({
            status: 'unavailable',
            message: 'ChurchServe could not verify your session.',
          });
        }

        return of(undefined);
      }),
    );
  }

  signIn(command: SignInCommand): Observable<void> {
    return this.http.post<unknown>('/api/session/sign-in', command).pipe(
      map(parseCurrentUser),
      tap((user) => this.state.set({ status: 'authenticated', user })),
      map(() => undefined),
    );
  }

  signOut(): Observable<void> {
    return this.http.delete<void>('/api/session').pipe(
      tap(() => this.state.set({ status: 'anonymous' })),
      map(() => undefined),
    );
  }
}
