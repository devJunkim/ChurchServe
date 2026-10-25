import { DOCUMENT } from '@angular/common';
import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';

@Directive({
  selector: '[appRouteFocus]',
})
export class RouteFocus {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserWindow = inject(DOCUMENT).defaultView;
  private pendingFocus?: number;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => pathOnly(event.urlAfterRedirects)),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.scheduleFocus());

    this.destroyRef.onDestroy(() => {
      if (this.pendingFocus !== undefined) {
        this.browserWindow?.clearTimeout(this.pendingFocus);
      }
    });
  }

  private scheduleFocus(): void {
    if (this.pendingFocus !== undefined) {
      this.browserWindow?.clearTimeout(this.pendingFocus);
    }

    this.pendingFocus = this.browserWindow?.setTimeout(() => {
      const target =
        this.host.nativeElement.querySelector<HTMLElement>('h1') ?? this.host.nativeElement;
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      this.pendingFocus = undefined;
    });
  }
}

function pathOnly(url: string): string {
  return url.split(/[?#]/, 1)[0];
}
