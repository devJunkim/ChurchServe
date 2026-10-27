import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from './core/auth/session-store';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { routes } from './app.routes';
import { apiBaseUrlInterceptor, RUNTIME_CONFIG, RuntimeConfig } from './core/config/runtime-config';

export function createAppConfig(runtimeConfig: RuntimeConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      { provide: ErrorHandler, useClass: GlobalErrorHandler },
      { provide: RUNTIME_CONFIG, useValue: runtimeConfig },
      provideHttpClient(withInterceptors([apiBaseUrlInterceptor])),
      provideAppInitializer(() => firstValueFrom(inject(SessionStore).restore())),
      provideRouter(routes),
    ],
  };
}
