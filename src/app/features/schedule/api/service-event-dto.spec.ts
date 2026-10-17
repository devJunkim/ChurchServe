import { parseServiceEvent, parseServiceEventList } from './service-event-dto';

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
    });
  });

  it('rejects malformed records in a list response', () => {
    expect(() => parseServiceEventList([{ ...validDto, requiredPositions: -1 }])).toThrowError(
      'expected contract',
    );
  });

  it('rejects a list response that is not an array', () => {
    expect(() => parseServiceEventList({ items: [validDto] })).toThrowError('was not an array');
  });
});
