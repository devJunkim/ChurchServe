using ChurchServe.Api.Assignments;
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
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "MinistryPositions" (
          "Id" TEXT NOT NULL CONSTRAINT "PK_MinistryPositions" PRIMARY KEY,
          "ServiceEventId" TEXT NOT NULL,
          "Ministry" TEXT NOT NULL,
          "RoleName" TEXT NOT NULL,
          "StartsAt" TEXT NOT NULL,
          "EndsAt" TEXT NOT NULL,
          CONSTRAINT "FK_MinistryPositions_ServiceEvents_ServiceEventId"
            FOREIGN KEY ("ServiceEventId") REFERENCES "ServiceEvents" ("Id") ON DELETE CASCADE
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE INDEX IF NOT EXISTS "IX_MinistryPositions_ServiceEventId"
          ON "MinistryPositions" ("ServiceEventId");
        """);
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS "Assignments" (
          "Id" TEXT NOT NULL CONSTRAINT "PK_Assignments" PRIMARY KEY,
          "PositionId" TEXT NOT NULL,
          "VolunteerId" TEXT NOT NULL,
          "ClientRequestId" TEXT NOT NULL,
          "Status" TEXT NOT NULL,
          CONSTRAINT "FK_Assignments_MinistryPositions_PositionId"
            FOREIGN KEY ("PositionId") REFERENCES "MinistryPositions" ("Id") ON DELETE CASCADE,
          CONSTRAINT "FK_Assignments_Volunteers_VolunteerId"
            FOREIGN KEY ("VolunteerId") REFERENCES "Volunteers" ("Id") ON DELETE RESTRICT
        );
        """);
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_Assignments_ClientRequestId"
          ON "Assignments" ("ClientRequestId");
        """);
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE UNIQUE INDEX IF NOT EXISTS "IX_Assignments_PositionId"
          ON "Assignments" ("PositionId") WHERE "Status" <> 'declined';
        """);
    await dbContext.Database.ExecuteSqlRawAsync("""
        CREATE INDEX IF NOT EXISTS "IX_Assignments_VolunteerId"
          ON "Assignments" ("VolunteerId");
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

    if (!await dbContext.MinistryPositions.AnyAsync())
    {
      dbContext.MinistryPositions.AddRange(
          CreatePosition(
              "sunday-welcome-host",
              "sunday-2026-11-01",
              "welcome",
              "Welcome host",
              "2026-11-01T09:30:00-05:00",
              "2026-11-01T11:30:00-05:00"),
          CreatePosition(
              "sunday-worship-vocal",
              "sunday-2026-11-01",
              "worship",
              "Vocalist",
              "2026-11-01T09:00:00-05:00",
              "2026-11-01T11:30:00-05:00"),
          CreatePosition(
              "rehearsal-sound",
              "rehearsal-2026-11-05",
              "technical",
              "Sound operator",
              "2026-11-05T18:45:00-05:00",
              "2026-11-05T20:30:00-05:00"),
          CreatePosition(
              "rehearsal-keys",
              "rehearsal-2026-11-05",
              "worship",
              "Keys player",
              "2026-11-05T18:45:00-05:00",
              "2026-11-05T20:30:00-05:00"));
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

  private static MinistryPosition CreatePosition(
      string id,
      string serviceEventId,
      string ministry,
      string roleName,
      string startsAt,
      string endsAt) => new()
      {
        Id = id,
        ServiceEventId = serviceEventId,
        Ministry = ministry,
        RoleName = roleName,
        StartsAt = DateTimeOffset.Parse(startsAt).UtcDateTime,
        EndsAt = DateTimeOffset.Parse(endsAt).UtcDateTime,
      };
}
