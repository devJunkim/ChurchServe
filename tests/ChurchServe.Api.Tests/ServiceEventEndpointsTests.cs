using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.ServiceEvents;

namespace ChurchServe.Api.Tests;

public sealed class ServiceEventEndpointsTests
{
  [Fact]
  public async Task List_returns_seeded_service_events()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/api/service-events");
    var serviceEvents = await response.Content.ReadFromJsonAsync<ServiceEventResponse[]>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(serviceEvents);
    Assert.Equal(2, serviceEvents.Length);
    Assert.Equal("sunday-2026-11-01", serviceEvents[0].Id);
  }

  [Fact]
  public async Task Detail_returns_not_found_for_an_unknown_id()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync("/api/service-events/missing");

    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
  }

  [Fact]
  public async Task Create_persists_and_returns_a_service_event()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    var request = new CreateServiceEventRequest(
        "Christmas Eve Service",
        DateTimeOffset.Parse("2026-12-24T18:00:00-05:00"),
        DateTimeOffset.Parse("2026-12-24T19:30:00-05:00"),
        "Main Sanctuary");

    var response = await client.PostAsJsonAsync("/api/service-events", request);
    var created = await response.Content.ReadFromJsonAsync<ServiceEventResponse>();

    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    Assert.NotNull(created);
    Assert.Equal("Christmas Eve Service", created.Title);
    Assert.Equal(1, created.Version);

    var stored = await client.GetFromJsonAsync<ServiceEventResponse>(
        $"/api/service-events/{created.Id}");
    Assert.Equal(created, stored);
  }

  [Fact]
  public async Task Create_rejects_an_end_time_before_the_start_time()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    var request = new CreateServiceEventRequest(
        "Invalid event",
        DateTimeOffset.Parse("2026-12-24T19:30:00-05:00"),
        DateTimeOffset.Parse("2026-12-24T18:00:00-05:00"),
        "Main Sanctuary");

    var response = await client.PostAsJsonAsync("/api/service-events", request);

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }
}
