using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.Authentication;
using Microsoft.AspNetCore.Mvc;

namespace ChurchServe.Api.Tests;

public sealed class SessionEndpointsTests
{
  [Fact]
  public async Task Session_returns_unauthorized_and_issues_an_antiforgery_token()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/api/session");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    Assert.NotEmpty(AuthenticationTestExtensions.ReadAntiforgeryToken(response));
  }

  [Fact]
  public async Task Protected_api_returns_unauthorized_without_a_session()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/api/service-events");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task Sign_in_establishes_a_session_without_returning_the_password()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var user = await client.GetFromJsonAsync<SessionUserResponse>("/api/session");

    Assert.NotNull(user);
    Assert.Equal("coordinator-1", user.Id);
    Assert.Equal("coordinator@churchserve.local", user.Email);
    Assert.Equal("Test Coordinator", user.DisplayName);
    Assert.Equal(["scheduler"], user.Roles);
    Assert.Equal(
        ["schedule.manage", "schedule.read", "volunteer.manage", "volunteer.read"],
        user.Permissions);
  }

  [Fact]
  public async Task Session_maps_a_reader_role_to_least_privilege_permissions()
  {
    using var factory = new ChurchServeApiFactory("reader");
    using var client = await factory.CreateAuthenticatedClientAsync();

    var user = await client.GetFromJsonAsync<SessionUserResponse>("/api/session");

    Assert.Equal(["reader"], user!.Roles);
    Assert.Equal(["schedule.read", "volunteer.read"], user.Permissions);
  }

  [Fact]
  public async Task Sign_in_accepts_a_trimmed_case_insensitive_email()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    var sessionResponse = await client.GetAsync("/api/session");
    client.DefaultRequestHeaders.Add(
        "X-XSRF-TOKEN",
        AuthenticationTestExtensions.ReadAntiforgeryToken(sessionResponse));

    var response = await client.PostAsJsonAsync(
        "/api/session/sign-in",
        new SignInRequest("  COORDINATOR@ChurchServe.Local ", "ChurchServeTest!13"));
    var user = await response.Content.ReadFromJsonAsync<SessionUserResponse>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.Equal("coordinator@churchserve.local", user?.Email);
  }

  [Fact]
  public async Task Sign_in_rejects_invalid_credentials()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    var sessionResponse = await client.GetAsync("/api/session");
    client.DefaultRequestHeaders.Add(
        "X-XSRF-TOKEN",
        AuthenticationTestExtensions.ReadAntiforgeryToken(sessionResponse));

    var response = await client.PostAsJsonAsync(
        "/api/session/sign-in",
        new SignInRequest("coordinator@churchserve.local", "wrong"));

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task Sign_in_rejects_a_missing_antiforgery_token()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.PostAsJsonAsync(
        "/api/session/sign-in",
        new SignInRequest("coordinator@churchserve.local", "ChurchServeTest!13"));

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Theory]
  [InlineData(null, "ChurchServeTest!13")]
  [InlineData("", "ChurchServeTest!13")]
  [InlineData("   ", "ChurchServeTest!13")]
  [InlineData("coordinator@churchserve.local", null)]
  [InlineData("coordinator@churchserve.local", "")]
  public async Task Sign_in_rejects_missing_credentials(string? email, string? password)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    var sessionResponse = await client.GetAsync("/api/session");
    client.DefaultRequestHeaders.Add(
        "X-XSRF-TOKEN",
        AuthenticationTestExtensions.ReadAntiforgeryToken(sessionResponse));

    var response = await client.PostAsJsonAsync(
        "/api/session/sign-in",
        new SignInRequest(email, password));
    var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.Contains("credentials", problem!.Errors.Keys);
  }

  [Fact]
  public async Task Sign_in_issues_a_securely_configured_session_cookie()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    var sessionResponse = await client.GetAsync("/api/session");
    client.DefaultRequestHeaders.Add(
        "X-XSRF-TOKEN",
        AuthenticationTestExtensions.ReadAntiforgeryToken(sessionResponse));

    var response = await client.PostAsJsonAsync(
        "/api/session/sign-in",
        new SignInRequest("coordinator@churchserve.local", "ChurchServeTest!13"));
    var cookie = Assert.Single(
        response.Headers.GetValues("Set-Cookie"),
        value => value.StartsWith("ChurchServe.Session=", StringComparison.Ordinal));

    Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
    Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
    Assert.DoesNotContain("ChurchServeTest!13", await response.Content.ReadAsStringAsync());
  }

  [Fact]
  public async Task Sign_out_invalidates_the_server_session()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var signOutResponse = await client.DeleteAsync("/api/session");
    var sessionResponse = await client.GetAsync("/api/session");

    Assert.Equal(HttpStatusCode.NoContent, signOutResponse.StatusCode);
    Assert.Equal(HttpStatusCode.Unauthorized, sessionResponse.StatusCode);
  }

  [Fact]
  public async Task Sign_out_requires_authentication()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.DeleteAsync("/api/session");

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task Sign_out_rejects_a_missing_antiforgery_token()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");

    var response = await client.DeleteAsync("/api/session");
    var sessionResponse = await client.GetAsync("/api/session");

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.Equal(HttpStatusCode.OK, sessionResponse.StatusCode);
  }
}
