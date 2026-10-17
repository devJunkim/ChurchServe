using ChurchServe.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace ChurchServe.Api.ServiceEvents;

public static class ServiceEventEndpoints
{
  public static IEndpointRouteBuilder MapServiceEventEndpoints(this IEndpointRouteBuilder endpoints)
  {
    var group = endpoints.MapGroup("/api/service-events");

    group.MapGet("/", async (
        string? month,
        string? ministry,
        int? page,
        int? pageSize,
        ChurchServeDbContext dbContext,
        CancellationToken cancellationToken) =>
    {
      var requestedPage = page.GetValueOrDefault(1);
      var requestedPageSize = pageSize.GetValueOrDefault(4);
      var errors = ValidatePaging(requestedPage, requestedPageSize);
      if (errors.Count > 0)
      {
        return Results.ValidationProblem(errors);
      }

      var query = dbContext.ServiceEvents.AsNoTracking();

      if (!string.IsNullOrWhiteSpace(month))
      {
        if (!TryGetMonthRange(month, out var monthStart, out var monthEnd))
        {
          return Results.ValidationProblem(new Dictionary<string, string[]>
          {
            ["month"] = ["Month must use YYYY-MM format."],
          });
        }

        query = query.Where(item => item.StartsAt >= monthStart && item.StartsAt < monthEnd);
      }

      var normalizedMinistry = ministry?.Trim().ToLowerInvariant();
      if (!string.IsNullOrEmpty(normalizedMinistry))
      {
        query = query.Where(item =>
            item.Ministries.Any(value => value.Ministry == normalizedMinistry));
      }

      var totalItems = await query.CountAsync(cancellationToken);
      var serviceEvents = await query
          .OrderBy(item => item.StartsAt)
          .ThenBy(item => item.Id)
          .Skip((requestedPage - 1) * requestedPageSize)
          .Take(requestedPageSize)
          .ToArrayAsync(cancellationToken);

      return Results.Ok(new ServiceEventPageResponse(
          serviceEvents.Select(ToResponse).ToArray(),
          requestedPage,
          requestedPageSize,
          totalItems));
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
        StartsAt = request.StartsAt.UtcDateTime,
        EndsAt = request.EndsAt.UtcDateTime,
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

  private static Dictionary<string, string[]> ValidatePaging(int page, int pageSize)
  {
    var errors = new Dictionary<string, string[]>();
    if (page < 1)
    {
      errors["page"] = ["Page must be at least 1."];
    }

    if (pageSize is < 1 or > 50)
    {
      errors["pageSize"] = ["Page size must be between 1 and 50."];
    }

    return errors;
  }

  private static bool TryGetMonthRange(
      string month,
      out DateTime monthStart,
      out DateTime monthEnd)
  {
    var parsed = DateTime.TryParseExact(
        $"{month}-01",
        "yyyy-MM-dd",
        CultureInfo.InvariantCulture,
        DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
        out monthStart);
    monthEnd = parsed ? monthStart.AddMonths(1) : default;
    return parsed;
  }

  private static ServiceEventResponse ToResponse(ServiceEvent serviceEvent) =>
      new(
          serviceEvent.Id,
          serviceEvent.Title,
          AsUtcOffset(serviceEvent.StartsAt),
          AsUtcOffset(serviceEvent.EndsAt),
          serviceEvent.Location,
          serviceEvent.RequiredPositions,
          serviceEvent.AssignedPositions,
          serviceEvent.Version);

  private static DateTimeOffset AsUtcOffset(DateTime value) =>
      new(DateTime.SpecifyKind(value, DateTimeKind.Utc));
}
