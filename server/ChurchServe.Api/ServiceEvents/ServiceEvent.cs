namespace ChurchServe.Api.ServiceEvents;

public sealed class ServiceEvent
{
  public required string Id { get; init; }

  public required string Title { get; init; }

  public DateTimeOffset StartsAt { get; init; }

  public DateTimeOffset EndsAt { get; init; }

  public required string Location { get; init; }

  public int RequiredPositions { get; init; }

  public int AssignedPositions { get; init; }

  public int Version { get; init; }
}
