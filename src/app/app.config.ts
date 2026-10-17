import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { InMemoryServiceEventRepository } from './features/schedule/in-memory-service-event-repository';
import { ServiceEventRepository } from './features/schedule/service-event-repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: ServiceEventRepository, useClass: InMemoryServiceEventRepository },
  ],
};
