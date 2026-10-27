using System.Diagnostics;
using ChurchServe.Api.Authentication;

namespace ChurchServe.Api.Observability;

public static class BrowserTelemetryEndpoints
{
  public static RouteHandlerBuilder MapBrowserTelemetryEndpoint(
      this IEndpointRouteBuilder endpoints) =>
      endpoints.MapPost("/api/telemetry", (
          BrowserTelemetryRequest request,
          HttpContext context,
          ChurchServeDiagnostics diagnostics,
          ILogger<BrowserTelemetryRequest> logger) =>
      {
        var errors = request.Validate();
        if (errors.Count > 0)
        {
          return Results.ValidationProblem(errors);
        }

        diagnostics.RecordBrowserEvent(request);
        Activity.Current?.SetTag("churchserve.browser.event", request.Name);
        Activity.Current?.SetTag("churchserve.browser.operation", request.Operation);
        Activity.Current?.SetTag("churchserve.browser.outcome", request.Outcome);
        logger.LogInformation(
            "Browser event {EventName} for {Operation} completed with {Outcome} in {DurationMs} ms " +
            "and browser correlation {BrowserCorrelationId}",
            request.Name,
            request.Operation,
            request.Outcome,
            request.DurationMs,
            request.CorrelationId ?? "none");

        return Results.Accepted();
      }).ValidateAntiforgery().RequireAuthorization();
}
