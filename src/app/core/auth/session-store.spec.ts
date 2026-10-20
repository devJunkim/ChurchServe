import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from './session-store';

describe('SessionStore', () => {
  let store: SessionStore;
  let http: HttpTestingController;
  const user = {
    id: 'coordinator-1',
    email: 'coordinator@churchserve.local',
    displayName: 'Demo Coordinator',
    roles: ['scheduler'],
    permissions: ['schedule.read', 'schedule.manage', 'volunteer.read', 'volunteer.manage'],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('restores an authenticated session', async () => {
    const result = firstValueFrom(store.restore());
    http.expectOne('/api/session').flush(user);
    await result;

    expect(store.session()).toEqual({ status: 'authenticated', user });
  });

  it('treats an unauthorized restore as anonymous', async () => {
    const result = firstValueFrom(store.restore());
    http.expectOne('/api/session').flush(null, { status: 401, statusText: 'Unauthorized' });
    await result;

    expect(store.session()).toEqual({ status: 'anonymous' });
  });

  it('keeps a non-401 restore failure distinct from anonymous', async () => {
    const result = firstValueFrom(store.restore());
    http.expectOne('/api/session').flush(null, { status: 503, statusText: 'Unavailable' });
    await result;

    expect(store.session()).toMatchObject({ status: 'unavailable' });
  });

  it('shares one restore request while multiple guards wait for the session', async () => {
    const first = firstValueFrom(store.ensureRestored());
    const second = firstValueFrom(store.ensureRestored());
    const requests = http.match('/api/session');

    expect(requests).toHaveLength(1);
    requests[0].flush(user);

    await expect(first).resolves.toEqual({ status: 'authenticated', user });
    await expect(second).resolves.toEqual({ status: 'authenticated', user });
  });

  it('returns a known session without another HTTP request', async () => {
    const restore = firstValueFrom(store.restore());
    http.expectOne('/api/session').flush(null, { status: 401, statusText: 'Unauthorized' });
    await restore;

    await expect(firstValueFrom(store.ensureRestored())).resolves.toEqual({
      status: 'anonymous',
    });
    http.expectNone('/api/session');
  });

  it('signs in without retaining the password in session state', async () => {
    const result = firstValueFrom(
      store.signIn({ email: user.email, password: 'ChurchServeDemo!13' }),
    );
    const request = http.expectOne('/api/session/sign-in');
    expect(request.request.body).toEqual({
      email: user.email,
      password: 'ChurchServeDemo!13',
    });
    request.flush(user);
    await result;

    expect(store.session()).toEqual({ status: 'authenticated', user });
    expect(JSON.stringify(store.session())).not.toContain('ChurchServeDemo!13');
  });

  it('becomes anonymous only after the server confirms sign-out', async () => {
    const signIn = firstValueFrom(store.signIn({ email: user.email, password: 'password' }));
    http.expectOne('/api/session/sign-in').flush(user);
    await signIn;

    const signOut = firstValueFrom(store.signOut());
    expect(store.session().status).toBe('authenticated');
    http.expectOne('/api/session').flush(null);
    await signOut;

    expect(store.session()).toEqual({ status: 'anonymous' });
  });
});
