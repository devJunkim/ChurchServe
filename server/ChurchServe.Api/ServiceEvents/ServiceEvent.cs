namespace ChurchServe.Api.ServiceEvents;

public sealed class ServiceEvent
{
  public required string Id { get; init; }

  public required string Title { get; init; }

  public DateTime StartsAt { get; init; }

  public DateTime EndsAt { get; init; }

  public required string Location { get; init; }

  public int RequiredPositions { get; init; }

  public int AssignedPositions { get; set; }

  public int Version { get; set; }

  public ICollection<ServiceEventMinistry> Ministries { get; } = [];
}
