using ChurchServe.Api.Data;
using ChurchServe.Api.ServiceEvents;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("ChurchServe")
    ?? throw new InvalidOperationException("Connection string 'ChurchServe' was not configured.");

builder.Services.AddDbContext<ChurchServeDbContext>(options => options.UseSqlite(connectionString));

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
  await DatabaseInitializer.InitializeAsync(
      scope.ServiceProvider.GetRequiredService<ChurchServeDbContext>());
}

app.MapServiceEventEndpoints();

app.Run();

public partial class Program;
