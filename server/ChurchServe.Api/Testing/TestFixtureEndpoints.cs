using ChurchServe.Api.Data;

namespace ChurchServe.Api.Testing;

public static class TestFixtureEndpoints
{
  public static RouteHandlerBuilder MapTestFixtureEndpoints(this IEndpointRouteBuilder endpoints) =>
      endpoints.MapPost("/api/test/reset", async (
          ChurchServeDbContext dbContext,
          CancellationToken cancellationToken) =>
      {
        await dbContext.Database.EnsureDeletedAsync(cancellationToken);
        dbContext.ChangeTracker.Clear();
        await DatabaseInitializer.InitializeAsync(dbContext);
        return Results.NoContent();
      });
}
