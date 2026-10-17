using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace ChurchServe.Api.Authentication;

public sealed class LocalAccountAuthenticator
{
  private readonly LocalAccount? account;
  private readonly PasswordHasher<LocalAccount> passwordHasher = new();

  public LocalAccountAuthenticator(
      IOptions<LocalAccountOptions> options,
      IHostEnvironment environment)
  {
    var configured = options.Value;
    if ((!environment.IsDevelopment() && environment.EnvironmentName != "Testing") ||
        string.IsNullOrWhiteSpace(configured.Password))
    {
      return;
    }

    var pending = new LocalAccount(
        configured.Id,
        configured.Email.Trim().ToLowerInvariant(),
        configured.DisplayName,
        string.Empty,
        configured.Role);
    account = pending with
    {
      PasswordHash = passwordHasher.HashPassword(pending, configured.Password),
    };
  }

  public LocalAccount? Authenticate(string email, string password)
  {
    if (account is null)
    {
      return null;
    }

    var passwordResult = passwordHasher.VerifyHashedPassword(
        account,
        account.PasswordHash,
        password);
    var emailMatches = string.Equals(
        account.Email,
        email.Trim(),
        StringComparison.OrdinalIgnoreCase);

    return emailMatches && passwordResult != PasswordVerificationResult.Failed
        ? account
        : null;
  }
}

public sealed record LocalAccount(
    string Id,
    string Email,
    string DisplayName,
    string PasswordHash,
    string Role);
