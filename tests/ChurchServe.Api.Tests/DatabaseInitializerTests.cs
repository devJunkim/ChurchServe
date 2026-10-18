using ChurchServe.Api.Data;
using ChurchServe.Api.ServiceEvents;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Tests;

public sealed class DatabaseInitializerTests
{
  [Fact]
  public async Task Initialize_creates_the_schema_and_expected_seed_data()
  {
    await using var database = await TestDatabase.CreateAsync(initialize: false);

    await DatabaseInitializer.InitializeAsync(database.Context);

    Assert.Equal(2, await database.Context.ServiceEvents.CountAsync());
    Assert.Equal(4, await database.Context.ServiceEventMinistries.CountAsync());
    Assert.Equal(6, await database.Context.Volunteers.CountAsync());
    Assert.Equal(12, await database.Context.VolunteerMinistries.CountAsync());
  }

  [Fact]
  public async Task Initialize_is_idempotent()
  {
    await using var database = await TestDatabase.CreateAsync(initialize: false);

    await DatabaseInitializer.InitializeAsync(database.Context);
    await DatabaseInitializer.InitializeAsync(database.Context);

    Assert.Equal(2, await database.Context.ServiceEvents.CountAsync());
    Assert.Equal(4, await database.Context.ServiceEventMinistries.CountAsync());
    Assert.Equal(6, await database.Context.Volunteers.CountAsync());
    Assert.Equal(12, await database.Context.VolunteerMinistries.CountAsync());
  }

  [Fact]
  public async Task Initialize_preserves_existing_service_events()
  {
    await using var database = await TestDatabase.CreateAsync(initialize: false);
    await database.Context.Database.EnsureCreatedAsync();
    database.Context.ServiceEvents.AddRange(
        CreateExistingEvent("sunday-2026-11-01", 7),
        CreateExistingEvent("rehearsal-2026-11-05", 8));
    await database.Context.SaveChangesAsync();

    await DatabaseInitializer.InitializeAsync(database.Context);

    var serviceEvents = await database.Context.ServiceEvents
        .OrderBy(item => item.Id)
        .ToArrayAsync();
    Assert.Equal(2, serviceEvents.Length);
    Assert.Equal([8, 7], serviceEvents.Select(item => item.Version));
  }

  [Fact]
  public async Task Deleting_a_volunteer_cascades_to_its_ministries()
  {
    await using var database = await TestDatabase.CreateAsync();
    var volunteer = await database.Context.Volunteers
        .Include(item => item.EligibleMinistries)
        .SingleAsync(item => item.Id == "alex-morgan");

    database.Context.Volunteers.Remove(volunteer);
    await database.Context.SaveChangesAsync();

    Assert.False(await database.Context.VolunteerMinistries
        .AnyAsync(item => item.VolunteerId == "alex-morgan"));
  }

  private sealed class TestDatabase : IAsyncDisposable
  {
    private readonly SqliteConnection connection;

    private TestDatabase(SqliteConnection connection, ChurchServeDbContext context)
    {
      this.connection = connection;
      Context = context;
    }

    public ChurchServeDbContext Context { get; }

    public static async Task<TestDatabase> CreateAsync(bool initialize = true)
    {
      var connection = new SqliteConnection("Data Source=:memory:");
      await connection.OpenAsync();
      var options = new DbContextOptionsBuilder<ChurchServeDbContext>()
          .UseSqlite(connection)
          .Options;
      var database = new TestDatabase(connection, new ChurchServeDbContext(options));
      if (initialize)
      {
        await DatabaseInitializer.InitializeAsync(database.Context);
      }

      return database;
    }

    public async ValueTask DisposeAsync()
    {
      await Context.DisposeAsync();
      await connection.DisposeAsync();
    }
  }

  private static ServiceEvent CreateExistingEvent(string id, int version) => new()
  {
    Id = id,
    Title = $"Existing {id}",
    StartsAt = new DateTime(2027, 1, 1, 15, 0, 0, DateTimeKind.Utc),
    EndsAt = new DateTime(2027, 1, 1, 16, 0, 0, DateTimeKind.Utc),
    Location = "Existing Room",
    RequiredPositions = 2,
    AssignedPositions = 1,
    Version = version,
  };
}
