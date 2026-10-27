using System.Net;
using System.Net.Http.Json;

namespace ChurchServe.Api.Tests;

public sealed class DeploymentEndpointsTests
{
  [Fact]
  public async Task Runtime_configuration_is_public_same_origin_and_not_cached()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/runtime-config.json");
    var configuration = await response.Content.ReadFromJsonAsync<RuntimeConfigResponse>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(configuration);
    Assert.Equal("/api", configuration.ApiBaseUrl);
    Assert.Equal("local", configuration.Release);
    Assert.Contains("no-store", response.Headers.CacheControl?.ToString());
    Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
    Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
  }

  [Theory]
  [InlineData("/health/live")]
  [InlineData("/health/ready")]
  public async Task Health_endpoints_report_healthy(string path)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync(path);
    var health = await response.Content.ReadFromJsonAsync<HealthResponse>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.Equal("healthy", health?.Status);
  }

  [Fact]
  public async Task Unknown_api_routes_are_not_rewritten_to_the_application_shell()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/api/not-a-real-route");

    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    Assert.NotEqual("text/html", response.Content.Headers.ContentType?.MediaType);
  }

  private sealed record RuntimeConfigResponse(string ApiBaseUrl, string Release);

  private sealed record HealthResponse(string Status);
}
