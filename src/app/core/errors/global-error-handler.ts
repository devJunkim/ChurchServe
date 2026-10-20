import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    const summary = error instanceof Error ? error.name : 'Unknown error';
    console.error('Unexpected application error.', summary);
  }
}
