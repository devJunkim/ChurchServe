using ChurchServe.Api.Data;
using ChurchServe.Api.ServiceEvents;
using ChurchServe.Api.Volunteers;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("ChurchServe")
    ?? throw new InvalidOperationException("Connection string 'ChurchServe' was not configured.");

builder.Services.AddDbContext<ChurchServeDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddScoped<VolunteerDirectory>();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
  await DatabaseInitializer.InitializeAsync(
      scope.ServiceProvider.GetRequiredService<ChurchServeDbContext>());
}

app.MapServiceEventEndpoints();
app.MapVolunteerEndpoints();

app.Run();

public partial class Program;
