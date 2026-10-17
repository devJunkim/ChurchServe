namespace ChurchServe.Api.Authentication;

public sealed class LocalAccountOptions
{
  public const string SectionName = "Authentication:LocalAccount";

  public string Id { get; init; } = string.Empty;
  public string Email { get; init; } = string.Empty;
  public string DisplayName { get; init; } = string.Empty;
  public string Password { get; init; } = string.Empty;
  public string Role { get; init; } = string.Empty;
}
