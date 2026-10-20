import { parseCurrentUser } from './session-dto';

describe('parseCurrentUser', () => {
  const response = {
    id: 'coordinator-1',
    email: 'coordinator@churchserve.local',
    displayName: 'Demo Coordinator',
    roles: ['scheduler'],
    permissions: ['schedule.read', 'schedule.manage', 'volunteer.read', 'volunteer.manage'],
  };

  it('parses known permissions', () => {
    expect(parseCurrentUser(response)).toEqual(response);
  });

  it('rejects an unknown permission rather than granting it accidentally', () => {
    expect(() =>
      parseCurrentUser({ ...response, permissions: [...response.permissions, 'billing.read'] }),
    ).toThrowError('expected contract');
  });

  it('requires the server to return permissions explicitly', () => {
    const { permissions: _, ...withoutPermissions } = response;
    expect(() => parseCurrentUser(withoutPermissions)).toThrowError('expected contract');
  });
});
