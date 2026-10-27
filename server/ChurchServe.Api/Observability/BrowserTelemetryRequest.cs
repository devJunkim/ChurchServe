using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace ChurchServe.Api.Observability;

public sealed partial class BrowserTelemetryRequest
{
  private static readonly HashSet<string> EventNames =
      ["http_request", "application_error"];

  private static readonly HashSet<string> Operations =
  [
    "application",
    "session.restore",
    "session.sign-in",
    "session.sign-out",
    "schedule.list",
    "schedule.detail",
    "schedule.create",
    "assignment.board",
    "assignment.create",
    "volunteer.search",
    "other",
  ];

  private static readonly HashSet<string> Outcomes =
  [
    "success",
    "cancelled",
    "validation",
    "unauthenticated",
    "forbidden",
    "not_found",
    "conflict",
    "unavailable",
    "unexpected",
  ];

  public string? Name { get; init; }

  public string? Operation { get; init; }

  public string? Outcome { get; init; }

  public double DurationMs { get; init; }

  public string? CorrelationId { get; init; }

  [JsonExtensionData]
  public Dictionary<string, JsonElement>? AdditionalProperties { get; init; }

  public Dictionary<string, string[]> Validate()
  {
    var errors = new Dictionary<string, string[]>(StringComparer.Ordinal);
    if (Name is null || !EventNames.Contains(Name))
    {
      errors["name"] = ["The telemetry event name is not allowed."];
    }
    if (Operation is null || !Operations.Contains(Operation))
    {
      errors["operation"] = ["The telemetry operation is not allowed."];
    }
    if (Outcome is null || !Outcomes.Contains(Outcome))
    {
      errors["outcome"] = ["The telemetry outcome is not allowed."];
    }
    if (!double.IsFinite(DurationMs) || DurationMs is < 0 or > 600_000)
    {
      errors["durationMs"] = ["The telemetry duration is outside the allowed range."];
    }
    if (CorrelationId is not null &&
        (CorrelationId.Length is < 8 or > 64 || !ValidCorrelationId().IsMatch(CorrelationId)))
    {
      errors["correlationId"] = ["The correlation identifier is invalid."];
    }
    if (AdditionalProperties is { Count: > 0 })
    {
      errors["payload"] = ["The telemetry payload contains unsupported properties."];
    }
    return errors;
  }

  [GeneratedRegex("^[A-Za-z0-9_-]+$", RegexOptions.CultureInvariant)]
  private static partial Regex ValidCorrelationId();
}
