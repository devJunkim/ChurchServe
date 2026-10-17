import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideServiceEventApi } from './features/schedule/api/provide-service-event-api';
import { provideVolunteerApi } from './features/volunteers/api/provide-volunteer-api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideServiceEventApi(),
    provideVolunteerApi(),
  ],
};
