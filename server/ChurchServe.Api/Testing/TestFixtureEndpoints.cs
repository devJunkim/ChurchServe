using ChurchServe.Api.Data;

namespace ChurchServe.Api.Testing;

public static class TestFixtureEndpoints
{
  public static IEndpointRouteBuilder MapTestFixtureEndpoints(this IEndpointRouteBuilder endpoints)
  {
    endpoints.MapPost("/api/test/reset", async (
          ChurchServeDbContext dbContext,
          CancellationToken cancellationToken) =>
      {
        await dbContext.Database.EnsureDeletedAsync(cancellationToken);
        dbContext.ChangeTracker.Clear();
        await DatabaseInitializer.InitializeAsync(dbContext);
        return Results.NoContent();
      });
    endpoints.MapGet("/api/test/failure", ThrowTestFailure);
    return endpoints;
  }

  private static IResult ThrowTestFailure() =>
      throw new InvalidOperationException("Sensitive diagnostic detail must not leave the API.");
}
