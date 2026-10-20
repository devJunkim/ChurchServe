export const PERMISSIONS = {
  scheduleRead: 'schedule.read',
  scheduleManage: 'schedule.manage',
  volunteerRead: 'volunteer.read',
  volunteerManage: 'volunteer.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly permissions: readonly Permission[];
}

export function hasPermission(user: CurrentUser | null, permission: Permission): boolean {
  return user?.permissions.includes(permission) ?? false;
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && Object.values(PERMISSIONS).includes(value as Permission);
}

export interface SignInCommand {
  readonly email: string;
  readonly password: string;
}
