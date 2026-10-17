import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from './core/auth/session-store';
import { routes } from './app.routes';
import { provideServiceEventApi } from './features/schedule/api/provide-service-event-api';
import { provideVolunteerApi } from './features/volunteers/api/provide-volunteer-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => firstValueFrom(inject(SessionStore).restore())),
    provideRouter(routes),
    provideServiceEventApi(),
    provideVolunteerApi(),
  ],
};
