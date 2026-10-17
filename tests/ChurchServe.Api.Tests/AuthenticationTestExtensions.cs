using System.Net.Http.Json;
using ChurchServe.Api.Authentication;

namespace ChurchServe.Api.Tests;

internal static class AuthenticationTestExtensions
{
  public static async Task<HttpClient> CreateAuthenticatedClientAsync(
      this ChurchServeApiFactory factory)
  {
    var client = factory.CreateClient();
    var sessionResponse = await client.GetAsync("/api/session");
    var token = ReadAntiforgeryToken(sessionResponse);
    client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);

    var signInResponse = await client.PostAsJsonAsync(
        "/api/session/sign-in",
        new SignInRequest("coordinator@churchserve.local", "ChurchServeTest!13"));
    signInResponse.EnsureSuccessStatusCode();
    client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
    client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", ReadAntiforgeryToken(signInResponse));
    return client;
  }

  public static string ReadAntiforgeryToken(HttpResponseMessage response)
  {
    var cookie = response.Headers.GetValues("Set-Cookie")
        .SelectMany(value => value.Split(','))
        .Select(value => value.Trim())
        .First(value => value.StartsWith("XSRF-TOKEN=", StringComparison.Ordinal));
    var encodedToken = cookie["XSRF-TOKEN=".Length..].Split(';')[0];
    return Uri.UnescapeDataString(encodedToken);
  }
}
