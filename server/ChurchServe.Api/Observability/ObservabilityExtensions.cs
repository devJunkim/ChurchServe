using System.Diagnostics;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace ChurchServe.Api.Observability;

public static class ObservabilityExtensions
{
  private const string ServiceName = "ChurchServe.Api";

  public static WebApplicationBuilder AddChurchServeObservability(
      this WebApplicationBuilder builder)
  {
    var serviceVersion = builder.Configuration["PublicRuntime:Release"] ?? "unknown";
    var hasOtlpExporter = !string.IsNullOrWhiteSpace(
        builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);

    if (!builder.Environment.IsEnvironment("Testing"))
    {
      builder.Logging.ClearProviders();
      builder.Logging.AddJsonConsole(options =>
      {
        options.IncludeScopes = true;
        options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ";
        options.UseUtcTimestamp = true;
      });
    }
    builder.Logging.Configure(options =>
    {
      options.ActivityTrackingOptions =
          ActivityTrackingOptions.TraceId |
          ActivityTrackingOptions.SpanId |
          ActivityTrackingOptions.ParentId;
    });

    if (hasOtlpExporter)
    {
      builder.Logging.AddOpenTelemetry(options =>
      {
        options.IncludeScopes = true;
        options.ParseStateValues = true;
        options.SetResourceBuilder(CreateResource(serviceVersion));
        options.AddOtlpExporter();
      });
    }

    builder.Services.AddSingleton<ChurchServeDiagnostics>();
    builder.Services.AddOpenTelemetry()
        .ConfigureResource(resource => resource.AddService(ServiceName, serviceVersion: serviceVersion))
        .WithTracing(tracing =>
        {
          tracing
              .AddSource(ChurchServeDiagnostics.ActivitySourceName)
              .AddAspNetCoreInstrumentation(options =>
              {
                options.Filter = context =>
                    !context.Request.Path.StartsWithSegments("/health/live");
              });
          if (hasOtlpExporter)
          {
            tracing.AddOtlpExporter();
          }
        })
        .WithMetrics(metrics =>
        {
          metrics
              .AddMeter(ChurchServeDiagnostics.MeterName)
              .AddAspNetCoreInstrumentation()
              .AddRuntimeInstrumentation();
          if (hasOtlpExporter)
          {
            metrics.AddOtlpExporter();
          }
        });

    return builder;
  }

  private static ResourceBuilder CreateResource(string serviceVersion) =>
      ResourceBuilder.CreateDefault().AddService(ServiceName, serviceVersion: serviceVersion);
}
