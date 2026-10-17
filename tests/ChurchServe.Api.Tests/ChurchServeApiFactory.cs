using ChurchServe.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChurchServe.Api.Tests;

public sealed class ChurchServeApiFactory : WebApplicationFactory<Program>
{
  private SqliteConnection? connection;

  protected override void ConfigureWebHost(IWebHostBuilder builder)
  {
    builder.UseEnvironment("Testing");
    builder.ConfigureServices(services =>
    {
      services.RemoveAll<DbContextOptions<ChurchServeDbContext>>();

      connection = new SqliteConnection("Data Source=:memory:");
      connection.Open();

      services.AddSingleton(connection);
      services.AddDbContext<ChurchServeDbContext>((serviceProvider, options) =>
              options.UseSqlite(serviceProvider.GetRequiredService<SqliteConnection>()));
    });
  }

  protected override void Dispose(bool disposing)
  {
    base.Dispose(disposing);

    if (disposing)
    {
      connection?.Dispose();
    }
  }
}
