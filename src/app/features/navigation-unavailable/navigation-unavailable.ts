import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { safeReturnUrl } from '../../core/routing/safe-return-url';

@Component({
  selector: 'app-navigation-unavailable',
  imports: [RouterLink],
  templateUrl: './navigation-unavailable.html',
  styleUrl: './navigation-unavailable.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationUnavailable {
  private readonly route = inject(ActivatedRoute);

  protected readonly retryUrl = safeReturnUrl(
    this.route.snapshot.queryParamMap.get('returnUrl'),
    '/',
  );
}
