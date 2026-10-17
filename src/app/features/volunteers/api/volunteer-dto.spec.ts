import { parseVolunteerList } from './volunteer-dto';

describe('parseVolunteerList', () => {
  it('copies valid volunteer DTOs into the domain model', () => {
    const ministries = ['technical', 'worship'];

    const volunteers = parseVolunteerList([
      { id: 'alex-morgan', displayName: 'Alex Morgan', eligibleMinistries: ministries },
    ]);

    expect(volunteers).toEqual([
      {
        id: 'alex-morgan',
        displayName: 'Alex Morgan',
        eligibleMinistries: ['technical', 'worship'],
      },
    ]);
    expect(volunteers[0].eligibleMinistries).not.toBe(ministries);
  });

  it('rejects a non-array response', () => {
    expect(() => parseVolunteerList({ items: [] })).toThrowError(
      'The volunteer response was not an array.',
    );
  });

  it('rejects malformed volunteers', () => {
    expect(() =>
      parseVolunteerList([{ id: 'alex-morgan', displayName: '', eligibleMinistries: [] }]),
    ).toThrowError('The API returned an invalid volunteer.');
  });
});
