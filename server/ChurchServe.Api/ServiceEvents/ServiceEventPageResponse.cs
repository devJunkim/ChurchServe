namespace ChurchServe.Api.ServiceEvents;

public sealed record ServiceEventPageResponse(
    IReadOnlyList<ServiceEventResponse> Items,
    int Page,
    int PageSize,
    int TotalItems);
