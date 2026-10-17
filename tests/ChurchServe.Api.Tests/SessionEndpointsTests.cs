using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.Authentication;

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
    Assert.Equal("coordinator@churchserve.local", user.Email);
    Assert.Equal(["scheduler"], user.Roles);
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
}
