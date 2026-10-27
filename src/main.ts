import { bootstrapApplication } from '@angular/platform-browser';
import { createAppConfig } from './app/app.config';
import { App } from './app/app';
import { loadRuntimeConfig } from './app/core/config/runtime-config';

loadRuntimeConfig()
  .then((runtimeConfig) => bootstrapApplication(App, createAppConfig(runtimeConfig)))
  .catch((error: unknown) => {
    console.error('ChurchServe could not start.', error);
    document.body.replaceChildren(createStartupError());
  });

function createStartupError(): HTMLElement {
  const main = document.createElement('main');
  const heading = document.createElement('h1');
  const message = document.createElement('p');
  heading.textContent = 'ChurchServe is unavailable';
  message.textContent = 'The application configuration could not be loaded. Try again later.';
  main.append(heading, message);
  return main;
}
