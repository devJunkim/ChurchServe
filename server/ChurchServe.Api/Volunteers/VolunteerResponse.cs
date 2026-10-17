namespace ChurchServe.Api.Volunteers;

public sealed record VolunteerResponse(
    string Id,
    string DisplayName,
    IReadOnlyList<string> EligibleMinistries);
