using ChurchServe.Api.Authentication;

namespace ChurchServe.Api.Volunteers;

public static class VolunteerEndpoints
{
  public static RouteGroupBuilder MapVolunteerEndpoints(this IEndpointRouteBuilder endpoints)
  {
    var group = endpoints.MapGroup("/api/volunteers");
    group.MapGet("", async (
        string? query,
        VolunteerDirectory directory,
        CancellationToken cancellationToken) =>
    {
      var normalizedQuery = query?.Trim() ?? string.Empty;
      return normalizedQuery.Length < 2
          ? Results.Ok(Array.Empty<VolunteerResponse>())
          : Results.Ok(await directory.SearchAsync(normalizedQuery, cancellationToken));
    }).RequireAuthorization(ChurchServePermissions.VolunteerRead);

    return group;
  }
}
