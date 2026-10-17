import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { HttpVolunteerRepository } from './http-volunteer-repository';

describe('HttpVolunteerRepository', () => {
  let repository: HttpVolunteerRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HttpVolunteerRepository],
    });
    repository = TestBed.inject(HttpVolunteerRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('encodes the query and parses the response', async () => {
    const result = firstValueFrom(repository.search('Anna & Annette'));
    const request = http.expectOne(
      (candidate) =>
        candidate.url === '/api/volunteers' && candidate.params.get('query') === 'Anna & Annette',
    );

    expect(request.request.method).toBe('GET');
    request.flush([
      { id: 'anna-brooks', displayName: 'Anna Brooks', eligibleMinistries: ['welcome'] },
    ]);

    await expect(result).resolves.toEqual([
      { id: 'anna-brooks', displayName: 'Anna Brooks', eligibleMinistries: ['welcome'] },
    ]);
  });
});
