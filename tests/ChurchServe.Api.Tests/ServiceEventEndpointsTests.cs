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
    var page = await response.Content.ReadFromJsonAsync<ServiceEventPageResponse>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(page);
    Assert.Equal(2, page.TotalItems);
    Assert.Equal(2, page.Items.Count);
    Assert.Equal("sunday-2026-11-01", page.Items[0].Id);
  }

  [Fact]
  public async Task List_filters_by_month_and_ministry()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var page = await client.GetFromJsonAsync<ServiceEventPageResponse>(
        "/api/service-events?month=2026-11&ministry=technical&page=1&pageSize=4");

    Assert.NotNull(page);
    Assert.Equal(1, page.TotalItems);
    Assert.Equal("rehearsal-2026-11-05", Assert.Single(page.Items).Id);
  }

  [Fact]
  public async Task List_returns_stable_paging_metadata()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var page = await client.GetFromJsonAsync<ServiceEventPageResponse>(
        "/api/service-events?month=2026-11&page=2&pageSize=1");

    Assert.NotNull(page);
    Assert.Equal(2, page.Page);
    Assert.Equal(1, page.PageSize);
    Assert.Equal(2, page.TotalItems);
    Assert.Equal("rehearsal-2026-11-05", Assert.Single(page.Items).Id);
  }

  [Theory]
  [InlineData("/api/service-events?month=bad")]
  [InlineData("/api/service-events?page=0")]
  [InlineData("/api/service-events?pageSize=51")]
  public async Task List_rejects_invalid_query_values(string url)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();

    var response = await client.GetAsync(url);

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
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
