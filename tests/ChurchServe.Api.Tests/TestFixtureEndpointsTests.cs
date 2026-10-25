using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.ServiceEvents;

namespace ChurchServe.Api.Tests;

public sealed class TestFixtureEndpointsTests
{
  [Fact]
  public async Task Reset_restores_seed_data_in_the_testing_environment()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    var created = await client.PostAsJsonAsync(
        "/api/service-events",
        new CreateServiceEventRequest(
            "Temporary event",
            DateTimeOffset.Parse("2026-11-20T10:00:00-05:00"),
            DateTimeOffset.Parse("2026-11-20T11:00:00-05:00"),
            "Test room"));
    created.EnsureSuccessStatusCode();

    var reset = await client.PostAsync("/api/test/reset", content: null);
    var schedule = await client.GetFromJsonAsync<ServiceEventPageResponse>(
        "/api/service-events?month=2026-11&page=1&pageSize=50");

    Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
    Assert.NotNull(schedule);
    Assert.Equal(2, schedule.TotalItems);
    Assert.DoesNotContain(schedule.Items, item => item.Title == "Temporary event");
  }

  [Fact]
  public async Task Reset_route_is_not_mapped_outside_the_testing_environment()
  {
    using var factory = new ChurchServeApiFactory(environment: "Production");
    using var client = factory.CreateClient();

    var response = await client.PostAsync("/api/test/reset", content: null);

    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
  }
}
