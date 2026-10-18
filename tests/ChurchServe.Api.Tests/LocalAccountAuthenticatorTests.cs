using ChurchServe.Api.Authentication;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace ChurchServe.Api.Tests;

public sealed class LocalAccountAuthenticatorTests
{
  private static readonly LocalAccountOptions ValidOptions = new()
  {
    Id = "coordinator-42",
    Email = "  Coordinator@ChurchServe.Local  ",
    DisplayName = "Test Coordinator",
    Password = "SecureTest!42",
    Role = "scheduler",
  };

  [Theory]
  [InlineData("Development")]
  [InlineData("Testing")]
  public void Authenticate_accepts_the_configured_account_in_allowed_environments(
      string environmentName)
  {
    var authenticator = CreateAuthenticator(ValidOptions, environmentName);

    var account = authenticator.Authenticate(
        "  COORDINATOR@churchserve.local ",
        "SecureTest!42");

    Assert.NotNull(account);
    Assert.Equal("coordinator-42", account.Id);
    Assert.Equal("coordinator@churchserve.local", account.Email);
    Assert.Equal("Test Coordinator", account.DisplayName);
    Assert.Equal("scheduler", account.Role);
    Assert.NotEqual("SecureTest!42", account.PasswordHash);
  }

  [Theory]
  [InlineData("coordinator@churchserve.local", "wrong-password")]
  [InlineData("different@churchserve.local", "SecureTest!42")]
  public void Authenticate_rejects_invalid_credentials(string email, string password)
  {
    var authenticator = CreateAuthenticator(ValidOptions, "Development");

    var account = authenticator.Authenticate(email, password);

    Assert.Null(account);
  }

  [Theory]
  [InlineData("Production")]
  [InlineData("Staging")]
  public void Authenticate_disables_the_local_account_outside_development_and_testing(
      string environmentName)
  {
    var authenticator = CreateAuthenticator(ValidOptions, environmentName);

    var account = authenticator.Authenticate(
        "coordinator@churchserve.local",
        "SecureTest!42");

    Assert.Null(account);
  }

  [Theory]
  [InlineData("")]
  [InlineData("   ")]
  public void Authenticate_disables_the_local_account_without_a_password(string password)
  {
    var options = new LocalAccountOptions
    {
      Id = ValidOptions.Id,
      Email = ValidOptions.Email,
      DisplayName = ValidOptions.DisplayName,
      Password = password,
      Role = ValidOptions.Role,
    };
    var authenticator = CreateAuthenticator(options, "Development");

    var account = authenticator.Authenticate(
        "coordinator@churchserve.local",
        password);

    Assert.Null(account);
  }

  private static LocalAccountAuthenticator CreateAuthenticator(
      LocalAccountOptions options,
      string environmentName) =>
      new(Options.Create(options), new TestHostEnvironment(environmentName));

  private sealed class TestHostEnvironment(string environmentName) : IHostEnvironment
  {
    public string EnvironmentName { get; set; } = environmentName;
    public string ApplicationName { get; set; } = "ChurchServe.Api.Tests";
    public string ContentRootPath { get; set; } = string.Empty;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
  }
}
