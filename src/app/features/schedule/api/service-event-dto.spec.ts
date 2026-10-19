import { parseServiceEvent, parseServiceEventPage } from './service-event-dto';

describe('service-event DTO validation', () => {
  const validDto = {
    id: 'event-1',
    title: 'Sunday Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
    version: 1,
  };

  it('maps a valid DTO without leaking transport-only fields', () => {
    expect(parseServiceEvent(validDto)).toEqual({
      id: 'event-1',
      title: 'Sunday Service',
      startsAt: '2026-11-01T10:00:00-05:00',
      endsAt: '2026-11-01T11:30:00-05:00',
      location: 'Main Sanctuary',
      requiredPositions: 10,
      assignedPositions: 7,
      version: 1,
    });
  });

  it('rejects malformed records in a page response', () => {
    expect(() =>
      parseServiceEventPage({
        items: [{ ...validDto, requiredPositions: -1 }],
        page: 1,
        pageSize: 4,
        totalItems: 1,
      }),
    ).toThrowError('expected contract');
  });

  it('parses paging metadata with the event collection', () => {
    expect(
      parseServiceEventPage({ items: [validDto], page: 2, pageSize: 4, totalItems: 6 }),
    ).toEqual({
      items: [expect.objectContaining({ id: 'event-1' })],
      page: 2,
      pageSize: 4,
      totalItems: 6,
    });
  });

  it('rejects malformed paging metadata', () => {
    expect(() =>
      parseServiceEventPage({ items: [validDto], page: 0, pageSize: 4, totalItems: 1 }),
    ).toThrowError('page response');
  });
});
