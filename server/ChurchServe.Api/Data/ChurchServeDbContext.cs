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

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    var serviceEvent = modelBuilder.Entity<ServiceEvent>();
    serviceEvent.ToTable("ServiceEvents");
    serviceEvent.HasKey(item => item.Id);
    serviceEvent.Property(item => item.Id).HasMaxLength(64);
    serviceEvent.Property(item => item.Title).HasMaxLength(200);
    serviceEvent.Property(item => item.Location).HasMaxLength(200);

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
  }
}
