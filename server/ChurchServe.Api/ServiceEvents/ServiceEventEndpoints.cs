using ChurchServe.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.ServiceEvents;

public static class ServiceEventEndpoints
{
  public static IEndpointRouteBuilder MapServiceEventEndpoints(this IEndpointRouteBuilder endpoints)
  {
    var group = endpoints.MapGroup("/api/service-events");

    group.MapGet("/", async (ChurchServeDbContext dbContext) =>
    {
      var serviceEvents = await dbContext.ServiceEvents
              .AsNoTracking()
              .ToListAsync();

      return Results.Ok(serviceEvents
              .OrderBy(item => item.StartsAt)
              .Select(ToResponse));
    });

    group.MapGet("/{id}", async (string id, ChurchServeDbContext dbContext) =>
    {
      var serviceEvent = await dbContext.ServiceEvents
              .AsNoTracking()
              .SingleOrDefaultAsync(item => item.Id == id);

      return serviceEvent is null
              ? Results.NotFound()
              : Results.Ok(ToResponse(serviceEvent));
    });

    group.MapPost("/", async (CreateServiceEventRequest request, ChurchServeDbContext dbContext) =>
    {
      var errors = Validate(request);
      if (errors.Count > 0)
      {
        return Results.ValidationProblem(errors);
      }

      var serviceEvent = new ServiceEvent
      {
        Id = Guid.NewGuid().ToString("N"),
        Title = request.Title!.Trim(),
        StartsAt = request.StartsAt,
        EndsAt = request.EndsAt,
        Location = request.Location!.Trim(),
        RequiredPositions = 0,
        AssignedPositions = 0,
        Version = 1,
      };

      dbContext.ServiceEvents.Add(serviceEvent);
      await dbContext.SaveChangesAsync();

      return Results.Created(
              $"/api/service-events/{Uri.EscapeDataString(serviceEvent.Id)}",
              ToResponse(serviceEvent));
    });

    return endpoints;
  }

  private static Dictionary<string, string[]> Validate(CreateServiceEventRequest request)
  {
    var errors = new Dictionary<string, string[]>();

    if (string.IsNullOrWhiteSpace(request.Title))
    {
      errors["title"] = ["A service name is required."];
    }

    if (string.IsNullOrWhiteSpace(request.Location))
    {
      errors["location"] = ["A location is required."];
    }

    if (request.EndsAt <= request.StartsAt)
    {
      errors["endsAt"] = ["The end time must be after the start time."];
    }

    return errors;
  }

  private static ServiceEventResponse ToResponse(ServiceEvent serviceEvent) =>
      new(
          serviceEvent.Id,
          serviceEvent.Title,
          serviceEvent.StartsAt,
          serviceEvent.EndsAt,
          serviceEvent.Location,
          serviceEvent.RequiredPositions,
          serviceEvent.AssignedPositions,
          serviceEvent.Version);
}
