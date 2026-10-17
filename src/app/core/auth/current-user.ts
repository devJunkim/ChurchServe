export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}

export interface SignInCommand {
  readonly email: string;
  readonly password: string;
}
