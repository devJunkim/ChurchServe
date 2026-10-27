using System.Diagnostics;
using System.Text.RegularExpressions;

namespace ChurchServe.Api.Observability;

public sealed partial class CorrelationIdMiddleware(
    RequestDelegate next,
    ILogger<CorrelationIdMiddleware> logger)
{
  public const string HeaderName = "X-Correlation-ID";
  private const string ItemKey = "ChurchServe.CorrelationId";

  public async Task InvokeAsync(HttpContext context)
  {
    var correlationId = ReadRequestId(context.Request.Headers[HeaderName].ToString()) ?? CreateId();
    context.Items[ItemKey] = correlationId;
    Activity.Current?.SetTag("churchserve.correlation_id", correlationId);
    context.Response.OnStarting(() =>
    {
      context.Response.Headers[HeaderName] = correlationId;
      return Task.CompletedTask;
    });

    using (logger.BeginScope(new Dictionary<string, object?>
    {
      ["CorrelationId"] = correlationId,
    }))
    {
      await next(context);
    }
  }

  public static string Get(HttpContext context) =>
      context.Items.TryGetValue(ItemKey, out var value) && value is string correlationId
          ? correlationId
          : CreateId();

  private static string? ReadRequestId(string value) =>
      value.Length is >= 8 and <= 64 && ValidId().IsMatch(value) ? value : null;

  private static string CreateId() =>
      Activity.Current?.TraceId.ToString() is { Length: > 0 } traceId
          ? traceId
          : Guid.NewGuid().ToString("N");

  [GeneratedRegex("^[A-Za-z0-9_-]+$", RegexOptions.CultureInvariant)]
  private static partial Regex ValidId();
}

public static class CorrelationIdMiddlewareExtensions
{
  public static IApplicationBuilder UseCorrelationId(this IApplicationBuilder app) =>
      app.UseMiddleware<CorrelationIdMiddleware>();
}
