using ChurchServe.Api.ServiceEvents;
using ChurchServe.Api.Volunteers;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Data;

public static class DatabaseInitializer
{
  public static async Task InitializeAsync(ChurchServeDbContext dbContext)
  {
    await dbContext.Database.EnsureCreatedAsync();

    // Part 9 used EnsureCreated before the volunteer tables existed. These idempotent
    // statements upgrade that local tutorial database without deleting its schedule data.
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "ServiceEventMinistries" (
          "ServiceEventId" TEXT NOT NULL,
          "Ministry" TEXT NOT NULL,
          CONSTRAINT "PK_ServiceEventMinistries" PRIMARY KEY ("ServiceEventId", "Ministry"),
          CONSTRAINT "FK_ServiceEventMinistries_ServiceEvents_ServiceEventId"
            FOREIGN KEY ("ServiceEventId") REFERENCES "ServiceEvents" ("Id") ON DELETE CASCADE
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "Volunteers" (
          "Id" TEXT NOT NULL CONSTRAINT "PK_Volunteers" PRIMARY KEY,
          "DisplayName" TEXT NOT NULL
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "VolunteerMinistries" (
          "VolunteerId" TEXT NOT NULL,
          "Ministry" TEXT NOT NULL,
          CONSTRAINT "PK_VolunteerMinistries" PRIMARY KEY ("VolunteerId", "Ministry"),
          CONSTRAINT "FK_VolunteerMinistries_Volunteers_VolunteerId"
            FOREIGN KEY ("VolunteerId") REFERENCES "Volunteers" ("Id") ON DELETE CASCADE
        );
        """);

    if (!await dbContext.ServiceEvents.AnyAsync())
    {
      dbContext.ServiceEvents.AddRange(
          new ServiceEvent
          {
            Id = "sunday-2026-11-01",
            Title = "Sunday Morning Service",
            StartsAt = DateTimeOffset.Parse("2026-11-01T10:00:00-05:00").UtcDateTime,
            EndsAt = DateTimeOffset.Parse("2026-11-01T11:30:00-05:00").UtcDateTime,
            Location = "Main Sanctuary",
            RequiredPositions = 10,
            AssignedPositions = 7,
            Version = 1,
          },
          new ServiceEvent
          {
            Id = "rehearsal-2026-11-05",
            Title = "Worship Team Rehearsal",
            StartsAt = DateTimeOffset.Parse("2026-11-05T19:00:00-05:00").UtcDateTime,
            EndsAt = DateTimeOffset.Parse("2026-11-05T20:30:00-05:00").UtcDateTime,
            Location = "Music Room",
            RequiredPositions = 6,
            AssignedPositions = 6,
            Version = 1,
          });
    }

    if (!await dbContext.Volunteers.AnyAsync())
    {
      dbContext.Volunteers.AddRange(
          CreateVolunteer("alex-morgan", "Alex Morgan", "technical", "worship"),
          CreateVolunteer("anna-brooks", "Anna Brooks", "children", "welcome"),
          CreateVolunteer("annette-lee", "Annette Lee", "prayer", "welcome"),
          CreateVolunteer("jordan-kim", "Jordan Kim", "hospitality", "welcome"),
          CreateVolunteer("maria-santos", "Maria Santos", "children", "worship"),
          CreateVolunteer("sam-wilson", "Sam Wilson", "hospitality", "technical"));
    }

    if (!await dbContext.ServiceEventMinistries.AnyAsync())
    {
      dbContext.ServiceEventMinistries.AddRange(
          CreateServiceEventMinistry("sunday-2026-11-01", "welcome"),
          CreateServiceEventMinistry("sunday-2026-11-01", "worship"),
          CreateServiceEventMinistry("rehearsal-2026-11-05", "technical"),
          CreateServiceEventMinistry("rehearsal-2026-11-05", "worship"));
    }

    await dbContext.SaveChangesAsync();
  }

  private static Volunteer CreateVolunteer(
      string id,
      string displayName,
      params string[] ministries)
  {
    var volunteer = new Volunteer { Id = id, DisplayName = displayName };
    foreach (var ministry in ministries)
    {
      volunteer.EligibleMinistries.Add(new VolunteerMinistry
      {
        VolunteerId = id,
        Ministry = ministry,
      });
    }

    return volunteer;
  }

  private static ServiceEventMinistry CreateServiceEventMinistry(
      string serviceEventId,
      string ministry) => new()
      {
        ServiceEventId = serviceEventId,
        Ministry = ministry,
      };
}
