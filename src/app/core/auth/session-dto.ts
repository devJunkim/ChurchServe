import { CurrentUser, isPermission } from './current-user';

export function parseCurrentUser(value: unknown): CurrentUser {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value['id']) ||
    !isNonEmptyString(value['email']) ||
    !isNonEmptyString(value['displayName']) ||
    !Array.isArray(value['roles']) ||
    !value['roles'].every((role) => typeof role === 'string' && role.length > 0) ||
    !Array.isArray(value['permissions']) ||
    !value['permissions'].every(isPermission)
  ) {
    throw new Error('The session response did not match the expected contract.');
  }

  return {
    id: value['id'],
    email: value['email'],
    displayName: value['displayName'],
    roles: value['roles'],
    permissions: value['permissions'],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
