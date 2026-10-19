using ChurchServe.Api.ServiceEvents;

namespace ChurchServe.Api.Assignments;

public sealed class MinistryPosition
{
  public required string Id { get; init; }
  public required string ServiceEventId { get; init; }
  public required string Ministry { get; init; }
  public required string RoleName { get; init; }
  public DateTime StartsAt { get; init; }
  public DateTime EndsAt { get; init; }
  public ServiceEvent ServiceEvent { get; init; } = null!;
  public ICollection<Assignment> Assignments { get; } = [];
}
