using System.Net;
using System.Net.Http.Json;
using ChurchServe.Api.Assignments;

namespace ChurchServe.Api.Tests;

public sealed class AssignmentEndpointsTests
{
  [Fact]
  public async Task Board_returns_positions_eligible_volunteers_and_current_version()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync(
        "/api/service-events/sunday-2026-11-01/assignment-board");
    var board = await response.Content.ReadFromJsonAsync<AssignmentBoardResponse>();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.NotNull(board);
    Assert.Equal(1, board.EventVersion);
    Assert.Equal(7, board.AssignedPositions);
    Assert.Equal(2, board.Positions.Count);
    Assert.Contains(board.Positions, item => item.Id == "sunday-welcome-host");
    Assert.Contains(board.Volunteers, item => item.Id == "alex-morgan");
    Assert.Empty(board.Assignments);
  }

  [Fact]
  public async Task Board_returns_not_found_for_an_unknown_event()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.GetAsync("/api/service-events/missing/assignment-board");

    Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
  }

  [Theory]
  [InlineData("GET", "/api/service-events/sunday-2026-11-01/assignment-board")]
  [InlineData("POST", "/api/service-events/sunday-2026-11-01/assignments")]
  public async Task Assignment_endpoints_require_authentication(string method, string url)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = factory.CreateClient();
    using var request = new HttpRequestMessage(new HttpMethod(method), url);
    if (method == "POST")
    {
      request.Content = JsonContent.Create(ValidRequest());
    }

    var response = await client.SendAsync(request);

    Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
  }

  [Fact]
  public async Task Assign_creates_an_assignment_and_advances_the_event_version()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        ValidRequest());
    var result = await response.Content.ReadFromJsonAsync<AssignVolunteerResponse>();
    var board = await client.GetFromJsonAsync<AssignmentBoardResponse>(
        "/api/service-events/rehearsal-2026-11-05/assignment-board");

    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    Assert.NotNull(result);
    Assert.Equal("rehearsal-sound", result.Assignment.PositionId);
    Assert.Equal("alex-morgan", result.Assignment.VolunteerId);
    Assert.Equal("Alex Morgan", result.Assignment.VolunteerDisplayName);
    Assert.Equal("accepted", result.Assignment.Status);
    Assert.Equal(2, result.EventVersion);
    Assert.Equal(7, result.AssignedPositions);
    Assert.Contains(result.Assignment, board!.Assignments);
    Assert.Equal(2, board.EventVersion);
  }

  [Fact]
  public async Task Assign_is_idempotent_for_a_repeated_client_request()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    var request = ValidRequest();

    var first = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        request);
    var second = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        request);
    var firstResult = await first.Content.ReadFromJsonAsync<AssignVolunteerResponse>();
    var secondResult = await second.Content.ReadFromJsonAsync<AssignVolunteerResponse>();
    var board = await client.GetFromJsonAsync<AssignmentBoardResponse>(
        "/api/service-events/rehearsal-2026-11-05/assignment-board");

    Assert.Equal(HttpStatusCode.Created, first.StatusCode);
    Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    Assert.Equal(firstResult, secondResult);
    Assert.Single(board!.Assignments);
    Assert.Equal(2, board.EventVersion);
  }

  [Fact]
  public async Task Assign_returns_authoritative_state_for_a_stale_version()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        ValidRequest());

    var response = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        new AssignVolunteerRequest("rehearsal-keys", "maria-santos", 1, "request-2"));
    var conflict = await response.Content.ReadFromJsonAsync<AssignmentConflictResponse>();

    Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    Assert.NotNull(conflict);
    Assert.Contains("schedule changed", conflict.Message, StringComparison.OrdinalIgnoreCase);
    Assert.Equal(2, conflict.Board.EventVersion);
    Assert.Single(conflict.Board.Assignments);
  }

  [Fact]
  public async Task Assign_rejects_a_filled_position()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        ValidRequest());

    var response = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        new AssignVolunteerRequest("rehearsal-sound", "sam-wilson", 2, "request-2"));

    Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
  }

  [Fact]
  public async Task Assign_rejects_an_overlapping_assignment_for_the_same_volunteer()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        ValidRequest());

    var response = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        new AssignVolunteerRequest("rehearsal-keys", "alex-morgan", 2, "request-2"));
    var conflict = await response.Content.ReadFromJsonAsync<AssignmentConflictResponse>();

    Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    Assert.Contains("overlapping", conflict!.Message, StringComparison.OrdinalIgnoreCase);
  }

  [Theory]
  [InlineData(null, "alex-morgan", 1, "request-1")]
  [InlineData("rehearsal-sound", null, 1, "request-1")]
  [InlineData("rehearsal-sound", "alex-morgan", 0, "request-1")]
  [InlineData("rehearsal-sound", "alex-morgan", 1, null)]
  public async Task Assign_validates_required_command_values(
      string? positionId,
      string? volunteerId,
      int expectedVersion,
      string? clientRequestId)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        new AssignVolunteerRequest(
            positionId,
            volunteerId,
            expectedVersion,
            clientRequestId));

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Theory]
  [InlineData("missing", "alex-morgan")]
  [InlineData("rehearsal-sound", "missing")]
  [InlineData("rehearsal-sound", "anna-brooks")]
  public async Task Assign_rejects_invalid_position_or_volunteer_choices(
      string positionId,
      string volunteerId)
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();

    var response = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        new AssignVolunteerRequest(positionId, volunteerId, 1, Guid.NewGuid().ToString("N")));

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  [Fact]
  public async Task Assign_rejects_a_missing_antiforgery_token()
  {
    using var factory = new ChurchServeApiFactory();
    using var client = await factory.CreateAuthenticatedClientAsync();
    client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");

    var response = await client.PostAsJsonAsync(
        "/api/service-events/rehearsal-2026-11-05/assignments",
        ValidRequest());

    Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
  }

  private static AssignVolunteerRequest ValidRequest() => new(
      "rehearsal-sound",
      "alex-morgan",
      1,
      "request-1");
}
