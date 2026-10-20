import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { HttpServiceEventRepository } from './http-service-event-repository';

describe('HttpServiceEventRepository', () => {
  let repository: HttpServiceEventRepository;
  let http: HttpTestingController;

  const dto = {
    id: 'event-1',
    title: 'Sunday Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
    version: 1,
  };
  const query = { month: '2026-11', ministry: 'technical', page: 2, pageSize: 4 };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HttpServiceEventRepository],
    });
    repository = TestBed.inject(HttpServiceEventRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists and maps service events returned by the API', async () => {
    const result = firstValueFrom(repository.list(query));

    const request = http.expectOne(
      '/api/service-events?month=2026-11&page=2&pageSize=4&ministry=technical',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ items: [dto], page: 2, pageSize: 4, totalItems: 5 });

    await expect(result).resolves.toEqual({
      items: [expect.objectContaining({ id: 'event-1', title: 'Sunday Service' })],
      page: 2,
      pageSize: 4,
      totalItems: 5,
    });
  });

  it('encodes an event ID and maps a detail response', async () => {
    const result = firstValueFrom(repository.findById('event/one'));

    const request = http.expectOne('/api/service-events/event%2Fone');
    expect(request.request.method).toBe('GET');
    request.flush({ ...dto, id: 'event/one' });

    await expect(result).resolves.toEqual(expect.objectContaining({ id: 'event/one' }));
  });

  it('maps a missing detail response to undefined', async () => {
    const result = firstValueFrom(repository.findById('missing'));

    http.expectOne('/api/service-events/missing').flush(null, {
      status: 404,
      statusText: 'Not Found',
    });

    await expect(result).resolves.toBeUndefined();
  });

  it('posts a create command and maps the created event', async () => {
    const command = {
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    };
    const result = firstValueFrom(repository.create(command));

    const request = http.expectOne('/api/service-events');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    request.flush({ ...dto, ...command, id: 'event-2' });

    await expect(result).resolves.toEqual(expect.objectContaining({ id: 'event-2' }));
  });

  it('normalizes a server validation error from create', async () => {
    const command = {
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    };
    const result = firstValueFrom(repository.create(command));

    http
      .expectOne('/api/service-events')
      .flush(
        { errors: { endsAt: ['The time range is invalid.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

    await expect(result).rejects.toEqual(
      expect.objectContaining({
        problem: { kind: 'validation', fields: { endsAt: 'The time range is invalid.' } },
      }),
    );
    http.expectNone('/api/service-events');
  });

  it('rejects malformed API data', async () => {
    const result = firstValueFrom(repository.list(query));

    http.expectOne('/api/service-events?month=2026-11&page=2&pageSize=4&ministry=technical').flush({
      items: [{ ...dto, startsAt: 'not-a-date' }],
      page: 2,
      pageSize: 4,
      totalItems: 5,
    });

    await expect(result).rejects.toThrowError('expected contract');
  });
});
