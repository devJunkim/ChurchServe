using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChurchServe.Api.Tests;

public sealed class ObservabilityEndpointsTests
{
  [Fact]
  public async Task Telemetry_accepts_the_bounded_authenticated_contract()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.PostAsJsonAsync("/api/telemetry", new
    {
      name = "http_request",
      operation = "schedule.list",
      outcome = "success",
      durationMs = 23.5,
      correlationId = "browser-request-123",
    });

    Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
  }

  [Fact]
  public async Task Telemetry_rejects_fields_that_could_expand_the_privacy_boundary()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.PostAsJsonAsync("/api/telemetry", new
    {
      name = "http_request",
      operation = "volunteer.search",
      outcome = "success",
      durationMs = 10,
      volunteerName = "Jane Doe",
    });

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.Contains("unsupported properties", await response.Content.ReadAsStringAsync());
  }

  [Fact]
  public async Task Telemetry_requires_authentication()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.PostAsJsonAsync("/api/telemetry", new
    {
      name = "http_request",
      operation = "other",
      outcome = "success",
      durationMs = 1,
    });

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task Correlation_ID_is_echoed_and_included_in_safe_problem_details()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    const string correlationId = "support-reference-123";
    client.DefaultRequestHeaders.Add("X-Correlation-ID", correlationId);

    var response = await client.GetAsync("/api/test/failure");
    var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

    Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
    Assert.Equal(correlationId, response.Headers.GetValues("X-Correlation-ID").Single());
    Assert.Equal(correlationId, document.RootElement.GetProperty("traceId").GetString());
    Assert.DoesNotContain("Sensitive diagnostic detail", document.RootElement.GetRawText());
  }

  [Fact]
  public async Task Invalid_correlation_ID_is_replaced()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    client.DefaultRequestHeaders.TryAddWithoutValidation("X-Correlation-ID", "contains spaces");

    var response = await client.GetAsync("/api/session");
    var correlationId = response.Headers.GetValues("X-Correlation-ID").Single();

    Assert.NotEqual("contains spaces", correlationId);
    Assert.Matches("^[A-Za-z0-9_-]{8,64}$", correlationId);
  }
}
