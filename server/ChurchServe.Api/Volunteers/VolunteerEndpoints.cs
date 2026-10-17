namespace ChurchServe.Api.Volunteers;

public static class VolunteerEndpoints
{
  public static IEndpointRouteBuilder MapVolunteerEndpoints(this IEndpointRouteBuilder endpoints)
  {
    endpoints.MapGet("/api/volunteers", async (
        string? query,
        VolunteerDirectory directory,
        CancellationToken cancellationToken) =>
    {
      var normalizedQuery = query?.Trim() ?? string.Empty;
      return normalizedQuery.Length < 2
          ? Results.Ok(Array.Empty<VolunteerResponse>())
          : Results.Ok(await directory.SearchAsync(normalizedQuery, cancellationToken));
    });

    return endpoints;
  }
}
