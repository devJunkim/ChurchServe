using ChurchServe.Api.Assignments;
using ChurchServe.Api.Authentication;
using ChurchServe.Api.Data;
using ChurchServe.Api.Deployment;
using ChurchServe.Api.ServiceEvents;
using ChurchServe.Api.Testing;
using ChurchServe.Api.Volunteers;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("ChurchServe")
    ?? throw new InvalidOperationException("Connection string 'ChurchServe' was not configured.");

builder.Services.AddDbContext<ChurchServeDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddScoped<VolunteerDirectory>();
builder.Services
    .AddOptions<PublicRuntimeOptions>()
    .Bind(builder.Configuration.GetSection(PublicRuntimeOptions.SectionName))
    .Validate(PublicRuntimeOptions.HasValidApiBaseUrl,
        "PublicRuntime:ApiBaseUrl must be a same-origin absolute path.")
    .Validate(PublicRuntimeOptions.HasValidRelease,
        "PublicRuntime:Release must be between 1 and 100 characters.")
    .ValidateOnStart();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["ready"]);
builder.Services.Configure<LocalAccountOptions>(
    builder.Configuration.GetSection(LocalAccountOptions.SectionName));
builder.Services.AddSingleton<LocalAccountAuthenticator>();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
      options.Cookie.Name = "ChurchServe.Session";
      options.Cookie.HttpOnly = true;
      options.Cookie.IsEssential = true;
      options.Cookie.SameSite = SameSiteMode.Strict;
      options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ||
          builder.Environment.EnvironmentName == "Testing"
          ? CookieSecurePolicy.SameAsRequest
          : CookieSecurePolicy.Always;
      options.ExpireTimeSpan = TimeSpan.FromHours(8);
      options.SlidingExpiration = true;
      options.Events.OnRedirectToLogin = context =>
      {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
      };
      options.Events.OnRedirectToAccessDenied = context =>
      {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
      };
    });
builder.Services.AddAuthorization(ChurchServePermissions.Configure);
builder.Services.AddAntiforgery(options =>
{
  options.HeaderName = "X-XSRF-TOKEN";
  options.Cookie.Name = "ChurchServe.Antiforgery";
  options.Cookie.HttpOnly = true;
  options.Cookie.SameSite = SameSiteMode.Strict;
  options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ||
      builder.Environment.EnvironmentName == "Testing"
      ? CookieSecurePolicy.SameAsRequest
      : CookieSecurePolicy.Always;
});

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
  await DatabaseInitializer.InitializeAsync(
      scope.ServiceProvider.GetRequiredService<ChurchServeDbContext>());
}

app.UseDeploymentHeaders();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapSessionEndpoints();
app.MapServiceEventEndpoints().RequireAuthorization();
app.MapAssignmentEndpoints().RequireAuthorization();
app.MapVolunteerEndpoints().RequireAuthorization();
app.MapDeploymentEndpoints();
if (app.Environment.IsEnvironment("Testing"))
{
  app.MapTestFixtureEndpoints();
}

app.MapMethods(
    "/api/{**path}",
    ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
