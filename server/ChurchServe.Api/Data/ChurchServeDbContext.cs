using ChurchServe.Api.Assignments;
using ChurchServe.Api.ServiceEvents;
using ChurchServe.Api.Volunteers;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Data;

public sealed class ChurchServeDbContext(DbContextOptions<ChurchServeDbContext> options)
    : DbContext(options)
{
  public DbSet<ServiceEvent> ServiceEvents => Set<ServiceEvent>();
  public DbSet<ServiceEventMinistry> ServiceEventMinistries => Set<ServiceEventMinistry>();
  public DbSet<Volunteer> Volunteers => Set<Volunteer>();
  public DbSet<VolunteerMinistry> VolunteerMinistries => Set<VolunteerMinistry>();
  public DbSet<MinistryPosition> MinistryPositions => Set<MinistryPosition>();
  public DbSet<Assignment> Assignments => Set<Assignment>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    var serviceEvent = modelBuilder.Entity<ServiceEvent>();
    serviceEvent.ToTable("ServiceEvents");
    serviceEvent.HasKey(item => item.Id);
    serviceEvent.Property(item => item.Id).HasMaxLength(64);
    serviceEvent.Property(item => item.Title).HasMaxLength(200);
    serviceEvent.Property(item => item.Location).HasMaxLength(200);
    serviceEvent.Property(item => item.Version).IsConcurrencyToken();

    var serviceEventMinistry = modelBuilder.Entity<ServiceEventMinistry>();
    serviceEventMinistry.ToTable("ServiceEventMinistries");
    serviceEventMinistry.HasKey(item => new { item.ServiceEventId, item.Ministry });
    serviceEventMinistry.Property(item => item.ServiceEventId).HasMaxLength(64);
    serviceEventMinistry.Property(item => item.Ministry).HasMaxLength(100);
    serviceEventMinistry.HasOne(item => item.ServiceEvent)
        .WithMany(item => item.Ministries)
        .HasForeignKey(item => item.ServiceEventId)
        .OnDelete(DeleteBehavior.Cascade);

    var volunteer = modelBuilder.Entity<Volunteer>();
    volunteer.ToTable("Volunteers");
    volunteer.HasKey(item => item.Id);
    volunteer.Property(item => item.Id).HasMaxLength(64);
    volunteer.Property(item => item.DisplayName).HasMaxLength(200);

    var eligibility = modelBuilder.Entity<VolunteerMinistry>();
    eligibility.ToTable("VolunteerMinistries");
    eligibility.HasKey(item => new { item.VolunteerId, item.Ministry });
    eligibility.Property(item => item.VolunteerId).HasMaxLength(64);
    eligibility.Property(item => item.Ministry).HasMaxLength(100);
    eligibility.HasOne(item => item.Volunteer)
        .WithMany(item => item.EligibleMinistries)
        .HasForeignKey(item => item.VolunteerId)
        .OnDelete(DeleteBehavior.Cascade);

    var position = modelBuilder.Entity<MinistryPosition>();
    position.ToTable("MinistryPositions");
    position.HasKey(item => item.Id);
    position.Property(item => item.Id).HasMaxLength(64);
    position.Property(item => item.ServiceEventId).HasMaxLength(64);
    position.Property(item => item.Ministry).HasMaxLength(100);
    position.Property(item => item.RoleName).HasMaxLength(200);
    position.HasOne(item => item.ServiceEvent)
        .WithMany()
        .HasForeignKey(item => item.ServiceEventId)
        .OnDelete(DeleteBehavior.Cascade);

    var assignment = modelBuilder.Entity<Assignment>();
    assignment.ToTable("Assignments");
    assignment.HasKey(item => item.Id);
    assignment.Property(item => item.Id).HasMaxLength(64);
    assignment.Property(item => item.PositionId).HasMaxLength(64);
    assignment.Property(item => item.VolunteerId).HasMaxLength(64);
    assignment.Property(item => item.ClientRequestId).HasMaxLength(64);
    assignment.Property(item => item.Status).HasMaxLength(32);
    assignment.HasIndex(item => item.ClientRequestId).IsUnique();
    assignment.HasIndex(item => item.PositionId)
        .IsUnique()
        .HasFilter("Status <> 'declined'");
    assignment.HasOne(item => item.Position)
        .WithMany(item => item.Assignments)
        .HasForeignKey(item => item.PositionId)
        .OnDelete(DeleteBehavior.Cascade);
    assignment.HasOne(item => item.Volunteer)
        .WithMany()
        .HasForeignKey(item => item.VolunteerId)
        .OnDelete(DeleteBehavior.Restrict);
  }
}
