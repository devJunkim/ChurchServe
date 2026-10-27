using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace ChurchServe.Api.Observability;

public sealed class ChurchServeDiagnostics : IDisposable
{
  public const string ActivitySourceName = "ChurchServe.Api";
  public const string MeterName = "ChurchServe.Api";

  public ActivitySource Activities { get; } = new(ActivitySourceName);

  private readonly Meter meter = new(MeterName);
  private readonly Counter<long> browserEvents;
  private readonly Histogram<double> browserDurations;

  public ChurchServeDiagnostics()
  {
    browserEvents = meter.CreateCounter<long>(
        "churchserve.browser.events",
        description: "Accepted privacy-safe browser telemetry events.");
    browserDurations = meter.CreateHistogram<double>(
        "churchserve.browser.duration",
        unit: "ms",
        description: "Browser-observed operation duration.");
  }

  public void RecordBrowserEvent(BrowserTelemetryRequest request)
  {
    var tags = new TagList
    {
      { "event.name", request.Name },
      { "operation", request.Operation },
      { "outcome", request.Outcome },
    };
    browserEvents.Add(1, tags);
    if (request.DurationMs > 0)
    {
      browserDurations.Record(request.DurationMs, tags);
    }
  }

  public void Dispose()
  {
    Activities.Dispose();
    meter.Dispose();
  }
}
