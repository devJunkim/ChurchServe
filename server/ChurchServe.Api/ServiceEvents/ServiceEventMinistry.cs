namespace ChurchServe.Api.ServiceEvents;

public sealed class ServiceEventMinistry
{
  public required string ServiceEventId { get; init; }
  public required string Ministry { get; init; }
  public ServiceEvent ServiceEvent { get; init; } = null!;
}
