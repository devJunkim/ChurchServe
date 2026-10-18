using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.ServiceEvents;
using Microsoft.AspNetCore.Mvc;

namespace ChurchServe.Api.Tests;

public sealed class ServiceEventEndpointsTests
{
  [Fact]
  public async Task List_returns_seeded_service_events()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync("/api/service-events");
    var page = await response.Content.ReadFromJsonAsync<ServiceEventPageResponse>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(page);
    Assert.Equal(2, page.TotalItems);
    Assert.Equal(2, page.Items.Count);
    Assert.Equal("sunday-2026-11-01", page.Items[0].Id);
    Assert.Equal(1, page.Page);
    Assert.Equal(4, page.PageSize);
  }

  [Fact]
  public async Task List_returns_an_empty_page_when_the_requested_page_is_past_the_end()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var page = await client.GetFromJsonAsync<ServiceEventPageResponse>(
        "/api/service-events?page=3&pageSize=1");

    Assert.NotNull(page);
    Assert.Equal(3, page.Page);
    Assert.Equal(2, page.TotalItems);
    Assert.Empty(page.Items);
  }

  [Fact]
  public async Task List_filters_by_month_and_ministry()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var page = await client.GetFromJsonAsync<ServiceEventPageResponse>(
        "/api/service-events?month=2026-11&ministry=technical&page=1&pageSize=4");

    Assert.NotNull(page);
    Assert.Equal(1, page.TotalItems);
    Assert.Equal("rehearsal-2026-11-05", Assert.Single(page.Items).Id);
  }

  [Fact]
  public async Task List_normalizes_ministry_whitespace_and_case()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var page = await client.GetFromJsonAsync<ServiceEventPageResponse>(
        "/api/service-events?ministry=%20WORSHIP%20");

    Assert.NotNull(page);
    Assert.Equal(2, page.TotalItems);
  }

  [Fact]
  public async Task List_returns_an_empty_page_for_filters_without_matches()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var page = await client.GetFromJsonAsync<ServiceEventPageResponse>(
        "/api/service-events?month=2026-12&ministry=unknown");

    Assert.NotNull(page);
    Assert.Equal(0, page.TotalItems);
    Assert.Empty(page.Items);
  }

  [Fact]
  public async Task List_returns_stable_paging_metadata()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

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
  [InlineData("/api/service-events?page=-1")]
  [InlineData("/api/service-events?pageSize=0")]
  [InlineData("/api/service-events?pageSize=51")]
  [InlineData("/api/service-events?month=2026-13")]
  [InlineData("/api/service-events?month=2026-1")]
  public async Task List_rejects_invalid_query_values(string url)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync(url);

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Fact]
  public async Task List_reports_every_invalid_paging_value()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync("/api/service-events?page=0&pageSize=51");
    var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.Equal(["page", "pageSize"], problem!.Errors.Keys.Order());
  }

  [Fact]
  public async Task Detail_returns_the_seeded_event_with_utc_timestamps()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync("/api/service-events/sunday-2026-11-01");
    var serviceEvent = await response.Content.ReadFromJsonAsync<ServiceEventResponse>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(serviceEvent);
    Assert.Equal("Sunday Morning Service", serviceEvent.Title);
    Assert.Equal(TimeSpan.Zero, serviceEvent.StartsAt.Offset);
    Assert.Equal(DateTimeOffset.Parse("2026-11-01T15:00:00Z"), serviceEvent.StartsAt);
    Assert.Equal(10, serviceEvent.RequiredPositions);
    Assert.Equal(7, serviceEvent.AssignedPositions);
  }

  [Fact]
  public async Task Detail_returns_not_found_for_an_unknown_id()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync("/api/service-events/missing");

    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
  }

  [Fact]
  public async Task Create_persists_and_returns_a_service_event()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
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
  public async Task Create_trims_text_converts_times_to_utc_and_sets_defaults()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    var request = new CreateServiceEventRequest(
        "  Evening Service  ",
        DateTimeOffset.Parse("2027-01-10T18:00:00-05:00"),
        DateTimeOffset.Parse("2027-01-10T19:30:00-05:00"),
        "  Fellowship Hall  ");

    var response = await client.PostAsJsonAsync("/api/service-events", request);
    var created = await response.Content.ReadFromJsonAsync<ServiceEventResponse>();

    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    Assert.NotNull(created);
    Assert.Equal("Evening Service", created.Title);
    Assert.Equal("Fellowship Hall", created.Location);
    Assert.Equal(DateTimeOffset.Parse("2027-01-10T23:00:00Z"), created.StartsAt);
    Assert.Equal(TimeSpan.Zero, created.StartsAt.Offset);
    Assert.Equal(0, created.RequiredPositions);
    Assert.Equal(0, created.AssignedPositions);
    Assert.Equal(1, created.Version);
    Assert.Equal($"/api/service-events/{created.Id}", response.Headers.Location?.OriginalString);
  }

  [Theory]
  [InlineData(null, "Main Sanctuary")]
  [InlineData("", "Main Sanctuary")]
  [InlineData("   ", "Main Sanctuary")]
  [InlineData("Valid title", null)]
  [InlineData("Valid title", "")]
  [InlineData("Valid title", "   ")]
  public async Task Create_rejects_missing_required_text(string? title, string? location)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    var request = new CreateServiceEventRequest(
        title,
        DateTimeOffset.Parse("2026-12-24T18:00:00-05:00"),
        DateTimeOffset.Parse("2026-12-24T19:30:00-05:00"),
        location);

    var response = await client.PostAsJsonAsync("/api/service-events", request);
    var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.Contains(title is null || string.IsNullOrWhiteSpace(title) ? "title" : "location",
        problem!.Errors.Keys);
  }

  [Fact]
  public async Task Create_rejects_an_end_time_before_the_start_time()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    var request = new CreateServiceEventRequest(
        "Invalid event",
        DateTimeOffset.Parse("2026-12-24T19:30:00-05:00"),
        DateTimeOffset.Parse("2026-12-24T18:00:00-05:00"),
        "Main Sanctuary");

    var response = await client.PostAsJsonAsync("/api/service-events", request);

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Fact]
  public async Task Create_rejects_an_end_time_equal_to_the_start_time()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    var startsAt = DateTimeOffset.Parse("2026-12-24T18:00:00-05:00");
    var request = new CreateServiceEventRequest(
        "Invalid event",
        startsAt,
        startsAt,
        "Main Sanctuary");

    var response = await client.PostAsJsonAsync("/api/service-events", request);
    var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.Contains("endsAt", problem!.Errors.Keys);
  }

  [Fact]
  public async Task Create_rejects_a_missing_antiforgery_token_without_persisting()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
    var request = new CreateServiceEventRequest(
        "Unprotected event",
        DateTimeOffset.Parse("2026-12-24T18:00:00-05:00"),
        DateTimeOffset.Parse("2026-12-24T19:30:00-05:00"),
        "Main Sanctuary");

    var response = await client.PostAsJsonAsync("/api/service-events", request);
    var page = await client.GetFromJsonAsync<ServiceEventPageResponse>("/api/service-events");

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    Assert.Equal(2, page!.TotalItems);
  }

  [Theory]
  [InlineData("GET", "/api/service-events")]
  [InlineData("GET", "/api/service-events/sunday-2026-11-01")]
  [InlineData("POST", "/api/service-events")]
  public async Task Service_event_endpoints_require_authentication(string method, string url)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    using var request = new HttpRequestMessage(new HttpMethod(method), url);
    if (method == "POST")
    {
      request.Content = JsonContent.Create(new CreateServiceEventRequest(
          "Event",
          DateTimeOffset.Parse("2026-12-24T18:00:00-05:00"),
          DateTimeOffset.Parse("2026-12-24T19:30:00-05:00"),
          "Room"));
    }

    var response = await client.SendAsync(request);

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }
}
